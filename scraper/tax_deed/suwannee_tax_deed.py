#!/usr/bin/env python3
"""Fetch the next Suwannee County tax deed schedule and parcel details."""

from __future__ import annotations

import io
import re
from datetime import date, datetime

import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader

from shared import HEADERS, base_property, centroid, property_type


SALES_URL = "https://www.suwgov.org/tax-deed-sales/"
PARCEL_LAYER = "http://gis.srwmd.state.fl.us/arcgis/rest/services/SRWMDGIS/SRWMD_Parcels/MapServer/11"


def _parse_schedule(pdf_bytes: bytes) -> tuple[str, list[dict]]:
    text = "\n".join((page.extract_text() or "") for page in PdfReader(io.BytesIO(pdf_bytes)).pages)
    date_match = re.search(r"(?:Monday|Tuesday|Wednesday|Thursday|Friday),\s+([A-Za-z]+ \d{1,2}, \d{4})", text)
    if not date_match:
        raise ValueError("Suwannee schedule date was not found")
    auction_date = datetime.strptime(date_match.group(1), "%B %d, %Y").date().isoformat()

    records: list[dict] = []
    for chunk in text.split("Case No. TD")[1:]:
        match = re.search(
            r"(\d+)/(\d{4}-\d+)\s+([\d,]+\.\d{2})\s+(.*?)\s+Legal Description:\s*"
            r"(\d{11})\s+(.*)",
            chunk,
            re.DOTALL,
        )
        if not match:
            continue
        case_number, certificate_number, opening_bid, owner_name, parcel_id, legal = match.groups()
        legal = re.split(r"NOTICE TO PROSPECTIVE BIDDERS", legal, maxsplit=1)[0]
        legal = re.sub(r"\s+", " ", legal).strip()
        records.append({
            "case_number": case_number,
            "certificate_number": certificate_number,
            "opening_bid": float(opening_bid.replace(",", "")),
            "owner_name": re.sub(r"\s+", " ", owner_name).strip(),
            "parcel_id": parcel_id,
            "legal": legal,
        })
    if not records:
        raise ValueError("No Suwannee tax deed cases were found")
    return auction_date, records


def _parcel_features(session: requests.Session, parcel_ids: list[str]) -> dict[str, dict]:
    fields = ("PARNO,PARUSEDESC,SITEADD,SCITY,SZIP,ASSD_TOT,AREATXT,OWNERNAME,"
              "TOT_LVG_AREA,YRBLT_ACT,LEGDECFULL")
    where = " OR ".join(f"PARNO LIKE '%{parcel_id}%'" for parcel_id in parcel_ids)
    response = session.post(
        f"{PARCEL_LAYER}/query",
        data={
            "f": "json",
            "where": where,
            "outFields": fields,
            "returnGeometry": "true",
            "outSR": "4326",
        },
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("error"):
        raise RuntimeError(payload["error"])
    features: dict[str, dict] = {}
    for feature in payload.get("features", []):
        parno = str(feature.get("attributes", {}).get("PARNO") or "")
        parcel_id = next((candidate for candidate in parcel_ids if candidate in parno), "")
        if parcel_id:
            features[parcel_id] = feature
    return features


def fetch_upcoming(today: date | None = None) -> list[dict]:
    today = today or date.today()
    session = requests.Session()
    session.headers.update(HEADERS)
    page = session.get(SALES_URL, timeout=30)
    page.raise_for_status()
    soup = BeautifulSoup(page.text, "html.parser")
    schedule_link = next(
        (
            link for link in soup.select('a[href*=".pdf"]')
            if "next tax deed sale" in link.get_text(" ", strip=True).lower()
        ),
        None,
    )
    if not schedule_link:
        return []
    pdf_url = schedule_link.get("href", "")
    pdf = session.get(pdf_url, timeout=60)
    pdf.raise_for_status()
    auction_date, records = _parse_schedule(pdf.content)
    if datetime.strptime(auction_date, "%Y-%m-%d").date() < today:
        return []

    try:
        feature_by_parcel = _parcel_features(session, [record["parcel_id"] for record in records])
    except (requests.RequestException, RuntimeError):
        feature_by_parcel = {}

    properties: list[dict] = []
    for record in records:
        feature = feature_by_parcel.get(record["parcel_id"], {})
        attributes = feature.get("attributes", {})
        use_description = str(attributes.get("PARUSEDESC") or "").strip()
        listing = base_property(
            property_id=f"suwannee-tax-deed-{record['case_number']}",
            address=str(attributes.get("SITEADD") or f"Parcel {record['parcel_id']}").strip(),
            city=str(attributes.get("SCITY") or "Suwannee County").strip(),
            county="Suwannee",
            price=record["opening_bid"],
            auction_date=auction_date,
            source="Suwannee County Tax Deed Sale",
            source_url=pdf_url,
            description=(
                f"Official Tax Deed case {record['case_number']}, certificate {record['certificate_number']}. "
                f"{use_description}. Legal description: {record['legal']}"
            ).strip(),
            case_number=record["case_number"],
            parcel_id=record["parcel_id"],
            owner_name=record["owner_name"],
        )
        latitude, longitude = centroid(feature.get("geometry"))
        listing.update({
            "zip": str(attributes.get("SZIP") or "").strip(),
            "propertyType": property_type(use_description),
            "sqft": int(attributes.get("TOT_LVG_AREA") or 0),
            "lotSize": round(float(attributes.get("AREATXT") or 0), 2),
            "yearBuilt": int(attributes.get("YRBLT_ACT") or 0) or None,
            "assessedValue": round(float(attributes.get("ASSD_TOT") or 0), 2),
            "latitude": latitude,
            "longitude": longitude,
        })
        properties.append(listing)
    return properties
