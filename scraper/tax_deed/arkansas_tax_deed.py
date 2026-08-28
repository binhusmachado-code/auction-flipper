#!/usr/bin/env python3
"""Fetch statewide Arkansas COSL tax-delinquent land auction catalogs."""

from __future__ import annotations

import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta
from typing import Any
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from shared import HEADERS, base_property, money


CONTENTS_URL = "https://cosl.org/Home/Contents"
SOURCE_NAME = "Arkansas Commissioner of State Lands Public Auction"
ARKANSAS_WARNING = (
    " Redemption closes at 4 p.m. on the last business day before the sale, and the sale "
    "is final. Arkansas COSL may withdraw parcels before the sale. The state conveys only a "
    "Limited Warranty Deed; verify title, access, property existence, liens, easements, "
    "restrictions, and assessments before bidding."
)


class ArkansasCatalogError(RuntimeError):
    """Raised when the statewide catalog cannot be refreshed completely."""


def parse_catalog_links(
    html: str,
    today: date | None = None,
    horizon_days: int = 370,
) -> list[tuple[str, str, str]]:
    """Return county, ISO sale date, and official URL for each future catalog."""
    today = today or date.today()
    last_day = today + timedelta(days=horizon_days)
    soup = BeautifulSoup(html, "html.parser")
    catalogs: dict[tuple[str, str], str] = {}
    for link in soup.find_all("a", href=True):
        label = str(link.get("aria-label") or "")
        match = re.fullmatch(r"View Catalog for (.+) on (\d{1,2}/\d{1,2}/\d{4})", label)
        if not match or "CatalogView?" not in str(link["href"]):
            continue
        sale_date = datetime.strptime(match.group(2), "%m/%d/%Y").date()
        if not today <= sale_date <= last_day:
            continue
        county = re.sub(r"\s+", " ", match.group(1)).strip().title()
        catalogs[(sale_date.isoformat(), county)] = urljoin(CONTENTS_URL, str(link["href"]))
    return [
        (county, sale_date, catalogs[(sale_date, county)])
        for sale_date, county in sorted(catalogs)
    ]


def parse_catalog(
    html: str,
    *,
    county: str,
    auction_date: str,
    source_url: str,
) -> list[dict[str, Any]]:
    """Normalize one official county catalog and exclude withdrawn entries."""
    soup = BeautifulSoup(html, "html.parser")
    records: list[dict[str, Any]] = []
    for row in soup.select("#tableAllCertifications tr"):
        cells = row.find_all("td", recursive=False)
        if len(cells) < 6:
            continue
        sale_number = cells[0].get_text(" ", strip=True)
        owner_name = re.sub(r"\s+", " ", cells[1].get_text(" ", strip=True)).strip()
        legal_description = re.sub(r"\s+", " ", cells[2].get_text(" ", strip=True)).strip()
        interested_parties = re.sub(r"\s+", " ", cells[3].get_text(" ", strip=True)).strip(" .")
        parcel_id = cells[4].get_text(" ", strip=True)
        minimum_bid = money(cells[5].get_text(" ", strip=True))
        if not sale_number or "ENTRY CANCELLED" in owner_name.upper() or not parcel_id or minimum_bid <= 0:
            continue

        county_slug = re.sub(r"[^a-z0-9]+", "-", county.lower()).strip("-")
        description = (
            f"Official Arkansas COSL tax-delinquent land sale {sale_number}. "
            f"The posted tax due is the minimum bid. Legal description: {legal_description or 'Not listed.'}"
        )
        if interested_parties:
            description += f" Interested parties listed by COSL: {interested_parties}."
        record = base_property(
            property_id=f"arkansas-tax-deed-{county_slug}-{sale_number}",
            address="",
            city=f"{county} County",
            county=county,
            price=minimum_bid,
            auction_date=auction_date,
            source=SOURCE_NAME,
            source_url=source_url,
            description=description,
            case_number=sale_number,
            parcel_id=parcel_id,
            owner_name=owner_name,
            deposit_required=0,
            state="AR",
        )
        record["notes"] += ARKANSAS_WARNING
        records.append(record)
    return records


def _fetch_catalog(county: str, auction_date: str, source_url: str) -> list[dict[str, Any]]:
    response = requests.get(source_url, headers=HEADERS, timeout=45)
    response.raise_for_status()
    if 'id="tableAllCertifications"' not in response.text:
        raise ArkansasCatalogError(f"{county} returned an unrecognized catalog page")
    records = parse_catalog(
        response.text,
        county=county,
        auction_date=auction_date,
        source_url=source_url,
    )
    return records


def fetch_upcoming(today: date | None = None) -> list[dict[str, Any]]:
    """Fetch every currently posted future Arkansas county public-auction catalog."""
    today = today or date.today()
    response = requests.get(CONTENTS_URL, headers=HEADERS, timeout=45)
    response.raise_for_status()
    catalogs = parse_catalog_links(response.text, today=today)
    if not catalogs:
        raise ArkansasCatalogError("Arkansas COSL returned no future catalogs")

    records: list[dict[str, Any]] = []
    failures: list[str] = []
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {
            executor.submit(_fetch_catalog, county, sale_date, url): county
            for county, sale_date, url in catalogs
        }
        for future in as_completed(futures):
            county = futures[future]
            try:
                records.extend(future.result())
            except (requests.RequestException, ValueError, ArkansasCatalogError) as exc:
                failures.append(f"{county}: {exc}")
    if failures:
        raise ArkansasCatalogError("; ".join(sorted(failures)))
    if len(records) != len({record["id"] for record in records}):
        raise ArkansasCatalogError("Arkansas COSL returned duplicate sale IDs")
    return sorted(records, key=lambda item: (item["auctionDate"], item["county"], item["id"]))
