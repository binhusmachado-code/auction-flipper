#!/usr/bin/env python3
"""Adams County, Colorado county-held tax lien inventory."""

from __future__ import annotations

import io
import re
import time
from datetime import date
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader


SOURCE_PAGE = (
    "https://adamscountyco.gov/our-county/elected-officials/"
    "treasurer-public-trustee/treasurer-division/tax-lien-sale/"
)
VALUES_QUERY = (
    "https://services3.arcgis.com/4PNQOtAivErR7nbT/arcgis/rest/services/"
    "Property_Values/FeatureServer/0/query"
)
PARCELS_QUERY = (
    "https://services3.arcgis.com/4PNQOtAivErR7nbT/arcgis/rest/services/"
    "Parcels/FeatureServer/0/query"
)
USER_AGENT = "AuctionFlipper/1.0 official public tax lien index"
ROW_PATTERN = re.compile(r"\b([RMN]\d{7})\s+(20\d{2})\s+[$]([\d,]+\.\d{2})")


def parse_county_held_lien_text(text: str) -> list[dict]:
    """Extract account, tax year, and current balance from the official PDF text."""
    records: list[dict] = []
    seen: set[tuple[str, int]] = set()
    for account_id, tax_year, balance in ROW_PATTERN.findall(text):
        key = (account_id, int(tax_year))
        if key in seen or not account_id.startswith("R"):
            continue
        seen.add(key)
        records.append({
            "accountId": account_id,
            "taxYear": int(tax_year),
            "balance": float(balance.replace(",", "")),
        })
    return records


def discover_county_held_pdf(html: str, base_url: str = SOURCE_PAGE) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for link in soup.find_all("a", href=True):
        label = " ".join(link.get_text(" ", strip=True).upper().split())
        if "COUNTY HELD LIEN LIST" in label:
            return urljoin(base_url, link["href"])
    raise RuntimeError("Adams County county-held lien document was not found")


def extract_pdf_text(content: bytes) -> str:
    return "\n".join(page.extract_text() or "" for page in PdfReader(io.BytesIO(content)).pages)


def _chunks(values: list[str], size: int = 75):
    for offset in range(0, len(values), size):
        yield values[offset:offset + size]


def _query_arcgis(
    url: str,
    field: str,
    values: list[str],
    *,
    geometry: bool = False,
    session: requests.Session,
) -> list[dict]:
    features: list[dict] = []
    for batch in _chunks(values, 20 if geometry else 75):
        quoted = ",".join(f"'{value.replace(chr(39), chr(39) * 2)}'" for value in batch)
        params = {
            "where": f"{field} IN ({quoted})",
            "outFields": (
                "PARCELNB,concataddr1,concataddr2,loccity,loczip,ownernamefull,legal"
                if geometry else
                "accountno,parcelnb,acttotalval,asdtotalval,lotsize,accttype,vacimp"
            ),
            "returnGeometry": "false",
            "returnCentroid": str(geometry).lower(),
            "outSR": "4326",
            "f": "json",
        }
        for attempt in range(2):
            try:
                response = session.get(url, params=params, timeout=20)
                if response.status_code not in {502, 503, 504} or attempt == 1:
                    break
            except requests.RequestException:
                if attempt == 1:
                    raise
            time.sleep(2 ** attempt)
        response.raise_for_status()
        payload = response.json()
        if payload.get("error"):
            raise RuntimeError(f"Adams County assessor query failed: {payload['error']}")
        features.extend(payload.get("features", []))
    return features


def _property_type(value: dict) -> str:
    if value.get("vacimp") == "V":
        return "Land"
    account_type = str(value.get("accttype") or "").lower()
    if "commercial" in account_type:
        return "Commercial"
    if "residential" in account_type:
        return "Unknown"
    return "Unknown"


def _city(parcel: dict) -> str:
    if str(parcel.get("loccity") or "").strip():
        return str(parcel["loccity"]).strip().title()
    city_state = str(parcel.get("concataddr2") or "").strip()
    city_state = re.sub(r"\s+CO(?:\s+\d{5}(?:-\d{4})?)?$", "", city_state, flags=re.I)
    return city_state.title() or "Adams County"


def build_listing(row: dict, value: dict | None, parcel_feature: dict | None, list_date: str) -> dict:
    value = value or {}
    parcel_feature = parcel_feature or {}
    parcel = parcel_feature.get("attributes", {})
    centroid = parcel_feature.get("centroid", {})
    account_id = row["accountId"]
    tax_year = row["taxYear"]
    balance = row["balance"]
    parcel_number = str(value.get("parcelnb") or parcel.get("PARCELNB") or "")
    actual_value = float(value.get("acttotalval") or 0)
    assessed_value = float(value.get("asdtotalval") or 0)
    address = str(parcel.get("concataddr1") or "").strip() or f"Account {account_id}"
    legal = " ".join(str(parcel.get("legal") or "").split())
    description = (
        f"Adams County-held real-property tax lien for tax year {tax_year}. "
        f"The official list dated {list_date} reports a current balance of ${balance:,.2f}."
    )
    if legal:
        description += f" Legal description: {legal}."

    return {
        "id": f"adams-co-tax-lien-{account_id.lower()}-{tax_year}",
        "address": address,
        "city": _city(parcel),
        "state": "CO",
        "zip": str(parcel.get("loczip") or "").strip(),
        "county": "Adams",
        "price": balance,
        "openingBid": None,
        "depositRequired": None,
        "assessedValue": assessed_value,
        "estimatedValue": actual_value,
        "valuationVerified": bool(actual_value or assessed_value),
        "propertyType": _property_type(value),
        "auctionType": "Tax Lien",
        "saleType": "Tax Lien",
        "auctionDate": None,
        "caseNumber": account_id,
        "parcelId": parcel_number,
        "ownerName": str(parcel.get("ownernamefull") or "").strip(),
        "source": "Adams County Treasurer County-Held Lien List",
        "sourceUrl": SOURCE_PAGE,
        "description": description,
        "imageUrl": "",
        "images": [],
        "status": "Active",
        "latitude": round(float(centroid.get("y") or 0), 7),
        "longitude": round(float(centroid.get("x") or 0), 7),
        "beds": 0,
        "baths": 0,
        "sqft": 0,
        "lotSize": float(value["lotsize"]) if value.get("lotsize") is not None else None,
        "yearBuilt": None,
        "daysOnMarket": max((date.today() - date.fromisoformat(list_date)).days, 0),
        "rehabEstimate": 0,
        "arv": actual_value,
        "notes": (
            "County-held lien, not a property sale. Confirm availability, current payoff, "
            "certificate interest rate, transfer procedure, and redemption status with the Treasurer."
        ),
        "taxAmount": balance,
        "interestRate": 0,
        "redemptionPeriod": 0,
        "delinquentYears": max(date.today().year - tax_year, 1),
    }


def fetch_county_held(session: requests.Session | None = None) -> tuple[list[dict], dict]:
    session = session or requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    page = session.get(SOURCE_PAGE, timeout=45)
    page.raise_for_status()
    pdf_url = discover_county_held_pdf(page.text)
    pdf = session.get(pdf_url, timeout=60)
    pdf.raise_for_status()
    text = extract_pdf_text(pdf.content)
    rows = parse_county_held_lien_text(text)
    if len(rows) < 25:
        raise RuntimeError(f"Adams County lien list returned only {len(rows)} real-property records")

    date_match = re.search(r"\b(\d{1,2})/(\d{1,2})/(20\d{2})\b", text)
    list_date = (
        f"{date_match.group(3)}-{int(date_match.group(1)):02d}-{int(date_match.group(2)):02d}"
        if date_match else date.today().isoformat()
    )
    account_ids = [row["accountId"] for row in rows]
    try:
        values = _query_arcgis(VALUES_QUERY, "accountno", account_ids, session=session)
    except (requests.RequestException, RuntimeError) as exc:
        print(f"Adams County value enrichment unavailable: {exc}")
        values = []
    values_by_account = {
        str(feature.get("attributes", {}).get("accountno")): feature.get("attributes", {})
        for feature in values
    }
    parcel_numbers = [
        str(value.get("parcelnb")) for value in values_by_account.values() if value.get("parcelnb")
    ]
    try:
        parcels = _query_arcgis(PARCELS_QUERY, "PARCELNB", parcel_numbers, geometry=True, session=session)
    except (requests.RequestException, RuntimeError) as exc:
        print(f"Adams County parcel enrichment unavailable: {exc}")
        parcels = []
    parcels_by_number = {
        str(feature.get("attributes", {}).get("PARCELNB")): feature for feature in parcels
    }

    listings = []
    for row in rows:
        value = values_by_account.get(row["accountId"])
        parcel_number = str(value.get("parcelnb")) if value and value.get("parcelnb") else ""
        listings.append(build_listing(row, value, parcels_by_number.get(parcel_number), list_date))
    listings.sort(key=lambda listing: (listing["price"], listing["id"]))
    metadata = {
        "state": "CO",
        "county": "Adams",
        "status": "verified",
        "count": len(listings),
        "listDate": list_date,
        "url": SOURCE_PAGE,
        "documentUrl": pdf_url,
        "matchedParcels": sum(bool(listing["parcelId"]) for listing in listings),
        "mappedParcels": sum(bool(listing["latitude"]) for listing in listings),
        "assessorStatus": "verified" if values and parcels else "unavailable",
    }
    return listings, metadata
