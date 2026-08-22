#!/usr/bin/env python3
"""Fetch future tax deed sales from county-owned Clerk Tax Deed Search sites."""

from __future__ import annotations

import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from shared import HEADERS, base_property, money, property_type


@dataclass(frozen=True)
class ClerkGridConfig:
    slug: str
    county: str
    base_url: str

    @property
    def source(self) -> str:
        return f"{self.county} County Clerk Tax Deed Search"


CLERK_GRID_FEEDS = (
    ClerkGridConfig("palm-beach", "Palm Beach", "https://taxdeed.mypalmbeachclerk.com/"),
    ClerkGridConfig("duval", "Duval", "https://taxdeed.duvalclerk.com/"),
    ClerkGridConfig("bay", "Bay", "https://records2.baycoclerk.com/TaxDeed/"),
    ClerkGridConfig("clay", "Clay", "https://landmark.clayclerk.com/TaxDeed/"),
)


def parse_sale_dates(
    html: str,
    today: date | None = None,
    horizon_days: int = 365,
) -> list[tuple[str, str]]:
    """Return official form values and ISO dates inside the requested future window."""
    today = today or date.today()
    last_day = today + timedelta(days=horizon_days)
    soup = BeautifulSoup(html, "html.parser")
    dates: dict[str, str] = {}
    for option in soup.select("#SearchSaleDateFrom option"):
        form_value = str(option.get("value") or "").strip()
        match = re.search(r"([A-Za-z]+ \d{1,2}, \d{4})", form_value)
        if not match:
            continue
        sale_date = datetime.strptime(match.group(1), "%B %d, %Y").date()
        if today <= sale_date <= last_day:
            dates[sale_date.isoformat()] = form_value
    return [(dates[iso_date], iso_date) for iso_date in sorted(dates)]


def _text(value: Any) -> str:
    return BeautifulSoup(str(value or ""), "html.parser").get_text(" ", strip=True)


def parse_grid_rows(payload: dict[str, Any]) -> list[dict[str, Any]]:
    """Normalize the shared jqGrid response and exclude redeemed or removed cases."""
    records: list[dict[str, Any]] = []
    for row in payload.get("rows", []):
        cells = row.get("cell", [])
        if len(cells) < 10 or _text(cells[5]).upper() != "SALE":
            continue
        records.append({
            "detail_id": str(row.get("id") or "").strip(),
            "applicant": _text(cells[0]),
            "case_number": _text(cells[1]),
            "certificate_number": _text(cells[2]),
            "parcel_id": _text(cells[3]),
            "auction_date": datetime.strptime(_text(cells[4]), "%m/%d/%Y").date().isoformat(),
            "status": _text(cells[5]).upper(),
            "opening_bid": money(_text(cells[6])),
            "owner_name": re.sub(r"\s+", " ", _text(cells[9]).replace("~", " ")).strip(" ,"),
        })
    return records


def parse_detail(html: str) -> dict[str, Any]:
    """Extract the labeled public fields from a Clerk Tax Deed Search detail page."""
    soup = BeautifulSoup(html, "html.parser")
    fields: dict[str, str] = {}
    appraiser_url = ""
    for row in soup.select("tr"):
        cells = row.find_all(["th", "td"], recursive=False)
        if len(cells) < 2:
            continue
        label = re.sub(r"[^a-z0-9]+", " ", cells[0].get_text(" ", strip=True).lower()).strip()
        value = re.sub(r"\s+", " ", cells[1].get_text(" ", strip=True)).strip()
        if label and value:
            fields[label] = value
        if label == "property appraiser":
            link = cells[1].find("a", href=True)
            appraiser_url = str(link.get("href")) if link else ""

    bid = fields.get("opening bid") or fields.get("base bid") or ""
    return {
        "case_number": fields.get("case number", ""),
        "certificate_number": fields.get("certificate", fields.get("certificate number", "")),
        "parcel_id": fields.get("parcel id", ""),
        "legal_description": fields.get("legal description", ""),
        "owner_name": fields.get("property owners", ""),
        "address": fields.get("property address", ""),
        "assessed_as": fields.get("assessed as", ""),
        "opening_bid": money(bid),
        "property_appraiser_url": appraiser_url,
    }


def parse_palm_beach_appraiser(html: str) -> dict[str, Any]:
    """Read public parcel facts that the Palm Beach auction record omits."""
    soup = BeautifulSoup(html, "html.parser")
    fields: dict[str, str] = {}
    for row in soup.select("tr"):
        cells = row.find_all(["th", "td"], recursive=False)
        if len(cells) < 2:
            continue
        label = re.sub(r"\s+", " ", cells[0].get_text(" ", strip=True)).strip()
        value = re.sub(r"\s+", " ", cells[1].get_text(" ", strip=True)).strip()
        if label and value and label not in fields:
            fields[label] = value
    return {
        "appraiser_address": fields.get("Location Address", ""),
        "appraiser_city": fields.get("Municipality", ""),
        "appraiser_use": fields.get("Property Use Code", ""),
        "sqft": int(money(fields.get("Total Square Feet*", "0"))),
        "lot_size": money(fields.get("Acres", "0")),
        "assessed_value": money(fields.get("Assessed Value", "0")),
    }


def _split_address(raw_address: str, parcel_id: str, county: str) -> tuple[str, str, str]:
    cleaned = re.sub(r"\s+", " ", raw_address or "").strip(" ,")
    if not cleaned or cleaned.upper() in {"N/A", "NA", "NONE", "UNKNOWN", "FL", "FLORIDA"}:
        fallback = f"Parcel {parcel_id}" if parcel_id else f"{county} County parcel (not listed)"
        return fallback, f"{county} County", ""
    match = re.match(r"^(.*),\s*([^,]+),\s*FL(?:ORIDA)?\s*(\d{5}(?:-\d{4})?)?$", cleaned, re.I)
    if not match:
        return cleaned, f"{county} County", ""
    return match.group(1).strip(), match.group(2).strip(), (match.group(3) or "").strip()


def _detail_url(config: ClerkGridConfig, detail_id: str) -> str:
    return urljoin(config.base_url, f"Home/Details?id={detail_id}")


def _fetch_detail(config: ClerkGridConfig, row: dict[str, Any]) -> tuple[dict[str, Any], str]:
    url = _detail_url(config, row["detail_id"])
    response = requests.get(url, headers=HEADERS, timeout=30)
    response.raise_for_status()
    detail = parse_detail(response.text)
    if config.slug == "palm-beach" and detail.get("property_appraiser_url"):
        appraiser = requests.get(str(detail["property_appraiser_url"]), headers=HEADERS, timeout=30)
        if appraiser.ok:
            detail.update(parse_palm_beach_appraiser(appraiser.text))
    return detail, url


def fetch_upcoming(
    config: ClerkGridConfig,
    today: date | None = None,
    horizon_days: int = 365,
) -> list[dict[str, Any]]:
    """Fetch all currently posted, future SALE records for one official county site."""
    today = today or date.today()
    session = requests.Session()
    session.headers.update(HEADERS)
    root = session.get(config.base_url, timeout=30)
    root.raise_for_status()
    sale_dates = parse_sale_dates(root.text, today=today, horizon_days=horizon_days)

    raw_rows: dict[str, dict[str, Any]] = {}
    grid_url = urljoin(config.base_url, "Home/GridSearchData")
    for form_value, iso_date in sale_dates:
        selected = session.post(
            config.base_url,
            data={
                "SearchSaleDateFrom": form_value,
                "SearchSaleDateTo": form_value,
                "buttonSubmitSaleDate": "",
            },
            timeout=30,
        )
        selected.raise_for_status()
        page = 1
        while True:
            response = session.get(
                grid_url,
                params={
                    "SearchType": "Sale Date",
                    "_search": "false",
                    "rows": 100,
                    "page": page,
                    "sidx": "SaleDate",
                    "sord": "asc",
                },
                timeout=30,
            )
            response.raise_for_status()
            payload = response.json()
            for row in parse_grid_rows(payload):
                row["auction_date"] = iso_date
                raw_rows[row["detail_id"]] = row
            if page >= int(payload.get("total") or 1):
                break
            page += 1

    detail_by_id: dict[str, tuple[dict[str, Any], str]] = {}
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {
            executor.submit(_fetch_detail, config, row): detail_id
            for detail_id, row in raw_rows.items()
        }
        for future in as_completed(futures):
            detail_id = futures[future]
            try:
                detail_by_id[detail_id] = future.result()
            except (requests.RequestException, ValueError) as exc:
                print(f"{config.county} detail {detail_id} failed: {exc}")

    properties: list[dict[str, Any]] = []
    for detail_id, row in raw_rows.items():
        detail, source_url = detail_by_id.get(detail_id, ({}, _detail_url(config, detail_id)))
        case_number = str(detail.get("case_number") or row["case_number"])
        parcel_id = str(detail.get("parcel_id") or row["parcel_id"])
        owner_name = str(detail.get("owner_name") or row["owner_name"])
        opening_bid = float(detail.get("opening_bid") or row["opening_bid"])
        legal = str(detail.get("legal_description") or "")
        assessed_as = str(detail.get("appraiser_use") or detail.get("assessed_as") or "")
        raw_address = str(detail.get("address") or "")
        if not raw_address.strip(" ,") or raw_address.strip(" ,").upper() in {"FL", "FLORIDA"}:
            raw_address = str(detail.get("appraiser_address") or "")
        address, city, zip_code = _split_address(raw_address, parcel_id, config.county)
        if detail.get("appraiser_city"):
            city = str(detail["appraiser_city"]).title()
        stable_case = re.sub(r"[^A-Za-z0-9]+", "-", case_number).strip("-").lower() or detail_id
        listing = base_property(
            property_id=f"{config.slug}-tax-deed-{stable_case}",
            address=address,
            city=city,
            county=config.county,
            price=opening_bid,
            auction_date=str(row["auction_date"]),
            source=config.source,
            source_url=source_url,
            description=(
                f"Official {config.county} County Tax Deed case {case_number}, certificate "
                f"{detail.get('certificate_number') or row['certificate_number']}. "
                f"Assessed as: {assessed_as or 'not stated'}. Legal description: {legal or 'see official record'}."
            ),
            case_number=case_number,
            parcel_id=parcel_id,
            owner_name=owner_name,
        )
        listing.update({
            "zip": zip_code,
            "propertyType": property_type(f"{assessed_as} {legal}"),
            "sqft": int(detail.get("sqft") or 0),
            "lotSize": float(detail.get("lot_size") or 0),
            "assessedValue": float(detail.get("assessed_value") or 0),
        })
        properties.append(listing)
    return sorted(properties, key=lambda item: (item["auctionDate"], item["id"]))
