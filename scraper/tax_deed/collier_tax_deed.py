#!/usr/bin/env python3
"""Fetch future Collier County tax deed legal notices from the official Clerk site."""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from shared import HEADERS, base_property, property_type


SALES_URL = "https://notices.collierclerk.com/genre/tax-deeds/"


def _field(text: str, start: str, end: str) -> str:
    match = re.search(rf"{start}\s*(.*?)\s*{end}", text, re.I | re.S)
    return re.sub(r"\s+", " ", match.group(1)).strip(" :") if match else ""


def _split_address(raw_address: str, parcel_id: str) -> tuple[str, str, str]:
    cleaned = re.sub(r"\s+", " ", raw_address).strip(" ,")
    if not cleaned or cleaned.upper() in {"N/A", "NA", "NONE", "UNKNOWN"}:
        return f"Parcel {parcel_id}", "Collier County", ""
    match = re.match(r"^(.*),\s*([^,]+),\s*FL(?:ORIDA)?\s*(\d{5}(?:-\d{4})?)?$", cleaned, re.I)
    if not match:
        return cleaned, "Collier County", ""
    return match.group(1).strip(), match.group(2).strip(), (match.group(3) or "").strip()


def parse_notice(text: str, source_url: str, today: date | None = None) -> dict[str, Any] | None:
    """Normalize one public legal notice, keeping unknown financial fields explicitly unknown."""
    today = today or date.today()
    application = re.search(r"Tax Deed Application\s*#\s*([A-Za-z0-9/-]+)", text, re.I)
    parcel = re.search(r"Parcel ID\s*#\s*([^\n]+)", text, re.I)
    sale = re.search(
        r"(?:on\s+)?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+"
        r"([A-Za-z]+ \d{1,2}, \d{4})",
        text,
        re.I,
    )
    if not application or not parcel or not sale:
        return None
    auction_date = datetime.strptime(sale.group(1).title(), "%B %d, %Y").date()
    if auction_date < today:
        return None

    application_number = application.group(1).strip()
    parcel_id = parcel.group(1).strip(" :")
    certificate = _field(text, r"Certificate Number:", r"Description of Property:")
    legal = _field(text, r"Description of Property:", r"Parcel ID\s*#")
    raw_address = _field(text, r"Property Address:", r"Name in Which Assessed:")
    owner_name = _field(text, r"Name in Which Assessed:", r"Name on Last Tax Roll|All of said property")
    address, city, zip_code = _split_address(raw_address, parcel_id)
    listing = base_property(
        property_id=f"collier-tax-deed-{application_number.lower()}",
        address=address,
        city=city,
        county="Collier",
        price=0,
        auction_date=auction_date.isoformat(),
        source="Collier County Clerk Tax Deed Notice",
        source_url=source_url,
        description=(
            f"Official Collier County Tax Deed application {application_number}, certificate "
            f"{certificate or 'not stated'}. Legal description: {legal or 'see official notice'}. "
            "The opening bid is not published in this legal notice; verify it with the Clerk before bidding."
        ),
        case_number=application_number,
        parcel_id=parcel_id,
        owner_name=owner_name,
    )
    listing.update({
        "zip": zip_code,
        "propertyType": property_type(legal),
        "openingBid": None,
        "depositRequired": None,
        "taxAmount": 0,
    })
    return listing


def fetch_upcoming(today: date | None = None, max_pages: int = 8) -> list[dict[str, Any]]:
    today = today or date.today()
    session = requests.Session()
    session.headers.update(HEADERS)
    properties: dict[str, dict[str, Any]] = {}
    for page in range(1, max_pages + 1):
        url = SALES_URL if page == 1 else urljoin(SALES_URL, f"page/{page}/")
        response = session.get(url, timeout=30)
        if response.status_code == 404:
            break
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        articles = soup.find_all("article")
        if not articles:
            break
        found_future = False
        for article in articles:
            link = article.find("a", href=True)
            source_url = str(link.get("href")) if link else url
            listing = parse_notice(article.get_text("\n", strip=True), source_url, today=today)
            if listing:
                properties[listing["id"]] = listing
                found_future = True
        if page > 1 and not found_future:
            break
    return sorted(properties.values(), key=lambda item: (item["auctionDate"], item["id"]))
