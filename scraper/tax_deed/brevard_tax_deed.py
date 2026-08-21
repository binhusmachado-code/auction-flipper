#!/usr/bin/env python3
"""Fetch future Brevard County tax deed schedules and official parcel details."""

from __future__ import annotations

import io
import re
from datetime import date, datetime
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader

from shared import HEADERS, base_property, centroid, property_type


SALES_URL = "https://www.brevardclerk.us/tax-deed-sales"
PARCEL_LAYER = "https://gis.brevardfl.gov/gissrv/rest/services/Base_Map/Parcel_New_WKID102100/MapServer/5"


def _parse_schedule(pdf_bytes: bytes) -> list[dict[str, str | float]]:
    pages = [(page.extract_text() or "") for page in PdfReader(io.BytesIO(pdf_bytes)).pages]
    records: list[dict[str, str | float]] = []
    record_pattern = re.compile(
        r"ACTIVE\s+(\d+)\s+\d{1,2}/\d{1,2}/\d{4}\s+\d+\s+(\d+)\s+"
        r"(\d{1,2}/\d{1,2}/\d{4})\s+\d+"
    )
    for page_text in pages:
        for case_number, parcel_id, sale_date in record_pattern.findall(page_text):
            records.append({
                "case_number": case_number,
                "parcel_id": parcel_id,
                "auction_date": datetime.strptime(sale_date, "%m/%d/%Y").date().isoformat(),
            })

    bids: list[float] = []
    for page_text in pages:
        if "ACTIVE" in page_text:
            continue
        for line in page_text.replace("Opening Bid", "").splitlines():
            if re.fullmatch(r"\s*\d+(?:\.\d+)?\s*", line):
                bids.append(round(float(line.strip()), 2))

    if len(records) != len(bids):
        raise ValueError(f"Brevard schedule has {len(records)} cases but {len(bids)} opening bids")
    for record, opening_bid in zip(records, bids):
        record["opening_bid"] = opening_bid
    return records


def _parcel_features(session: requests.Session, parcel_ids: list[str]) -> dict[str, dict]:
    features: dict[str, dict] = {}
    for start in range(0, len(parcel_ids), 50):
        batch = parcel_ids[start:start + 50]
        response = session.post(
            f"{PARCEL_LAYER}/query",
            data={
                "f": "json",
                "where": f"TaxAcct IN ({','.join(batch)})",
                "outFields": (
                    "TaxAcct,LEGAL_DESC,ACRES,BLDG_VALUE,LAND_VALUE,USE_CODE_DESCRIPTION,LIV_AREA,"
                    "STREET_NUMBER,STREET_DIRECTION_PREFIX,STREET_NAME,STREET_TYPE,CITY,ZIP_CODE,OWNER_NAME1"
                ),
                "returnGeometry": "true",
                "outSR": "4326",
            },
            timeout=60,
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("error"):
            raise RuntimeError(payload["error"])
        for feature in payload.get("features", []):
            features[str(feature.get("attributes", {}).get("TaxAcct", ""))] = feature
    return features


def _address(attributes: dict) -> str:
    address = " ".join(
        str(attributes.get(field) or "").strip()
        for field in ("STREET_NUMBER", "STREET_DIRECTION_PREFIX", "STREET_NAME", "STREET_TYPE")
        if str(attributes.get(field) or "").strip()
    )
    return "" if address.upper() in {"UNKNOWN", "N/A", "NONE"} else address


def fetch_upcoming(today: date | None = None) -> list[dict]:
    today = today or date.today()
    session = requests.Session()
    session.headers.update(HEADERS)
    response = session.get(SALES_URL, timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    schedules: list[tuple[str, str, str]] = []
    seen: set[str] = set()
    for link in soup.select('a[href*="tax-deed-sales?ID="]'):
        match = re.search(r"([A-Za-z]+ \d{1,2}, \d{4})", link.get_text(" ", strip=True))
        detail_url = urljoin(SALES_URL, link.get("href", "").split("#", 1)[0])
        if not match or detail_url in seen:
            continue
        sale_date = datetime.strptime(match.group(1), "%B %d, %Y").date()
        if sale_date < today:
            continue
        seen.add(detail_url)
        detail = session.get(detail_url, timeout=30)
        detail.raise_for_status()
        detail_soup = BeautifulSoup(detail.text, "html.parser")
        pdf_link = detail_soup.select_one('a[href*="Files.Serve"]')
        if pdf_link:
            schedules.append((sale_date.isoformat(), detail_url, urljoin(detail_url, pdf_link.get("href", ""))))

    raw_records: list[dict] = []
    for sale_date, detail_url, pdf_url in schedules:
        pdf = session.get(pdf_url, timeout=60)
        pdf.raise_for_status()
        for record in _parse_schedule(pdf.content):
            record.update({"auction_date": sale_date, "source_url": detail_url})
            raw_records.append(record)

    feature_by_parcel = _parcel_features(session, [str(record["parcel_id"]) for record in raw_records])
    properties: list[dict] = []
    for record in raw_records:
        parcel_id = str(record["parcel_id"])
        case_number = str(record["case_number"])
        feature = feature_by_parcel.get(parcel_id, {})
        attributes = feature.get("attributes", {})
        legal = str(attributes.get("LEGAL_DESC") or "").strip()
        use_description = str(attributes.get("USE_CODE_DESCRIPTION") or "").strip()
        listing = base_property(
            property_id=f"brevard-tax-deed-{case_number}",
            address=_address(attributes) or f"Parcel {parcel_id}",
            city=str(attributes.get("CITY") or "Brevard County").strip(),
            county="Brevard",
            price=float(record["opening_bid"]),
            auction_date=str(record["auction_date"]),
            source="Brevard County Tax Deed Sale",
            source_url=str(record["source_url"]),
            description=f"Official Tax Deed case {case_number}. {use_description}. Legal description: {legal}".strip(),
            case_number=case_number,
            parcel_id=parcel_id,
            owner_name=str(attributes.get("OWNER_NAME1") or "").strip(),
        )
        latitude, longitude = centroid(feature.get("geometry"))
        listing.update({
            "zip": str(attributes.get("ZIP_CODE") or "").strip(),
            "propertyType": property_type(use_description),
            "sqft": int(attributes.get("LIV_AREA") or 0),
            "lotSize": round(float(attributes.get("ACRES") or 0), 2),
            "assessedValue": round(float(attributes.get("BLDG_VALUE") or 0) + float(attributes.get("LAND_VALUE") or 0), 2),
            "latitude": latitude,
            "longitude": longitude,
        })
        properties.append(listing)
    return properties
