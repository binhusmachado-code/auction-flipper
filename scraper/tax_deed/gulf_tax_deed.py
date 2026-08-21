#!/usr/bin/env python3
"""Fetch active Gulf County tax deed cards from the official clerk page."""

from __future__ import annotations

import re
from datetime import date, datetime

import requests
from bs4 import BeautifulSoup

from shared import HEADERS, base_property, money


SALES_URL = "https://www.gulfclerk.com/courts/tax-deeds/"


def _labeled_anchor(card: BeautifulSoup, label: str) -> str:
    marker = card.find(lambda tag: tag.name == "span" and label.lower() in tag.get_text(" ", strip=True).lower())
    if not marker:
        return ""
    link = marker.parent.find("a")
    return link.get_text(" ", strip=True) if link else ""


def fetch_upcoming(today: date | None = None) -> list[dict]:
    today = today or date.today()
    response = requests.get(SALES_URL, headers=HEADERS, timeout=30)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    properties: list[dict] = []
    for card in soup.select("div.shadow.mb-2"):
        status = card.find(string=lambda value: value and value.strip().lower() == "active")
        if not status:
            continue
        text = card.get_text(" ", strip=True)
        sale_match = re.search(r"Sale Date\s+(\d{2}/\d{2}/\d{2})", text)
        bid_match = re.search(r"\$[\d,]+\.\d{2}", text)
        deposit_match = re.search(r"Est\. Min\. Deposit:\s*(\$[\d,]+\.\d{2})", text)
        parcel_id = _labeled_anchor(card, "Parcel ID")
        case_number = _labeled_anchor(card, "Case No.")
        if not sale_match or not bid_match or not parcel_id:
            continue
        auction_date = datetime.strptime(sale_match.group(1), "%m/%d/%y").date()
        if auction_date < today:
            continue

        location_label = card.find("strong", string=lambda value: value and value.strip() == "Location")
        location_parts = []
        if location_label:
            location_parts = [p.get_text(" ", strip=True) for p in location_label.parent.parent.find_all("p")][1:]
        address = location_parts[0] if location_parts else f"Parcel {parcel_id}"
        city = (location_parts[1].split(",", 1)[0] if len(location_parts) > 1 else "Gulf County").title()

        owner_label = card.find("strong", string=lambda value: value and value.strip() == "Owner")
        owner_name = ""
        if owner_label:
            owner_name = owner_label.parent.get_text(" ", strip=True).removeprefix("Owner").strip()

        properties.append(base_property(
            property_id=f"gulf-tax-deed-{case_number or parcel_id}",
            address=address.title(),
            city=city,
            county="Gulf",
            price=money(bid_match.group(0)),
            auction_date=auction_date.isoformat(),
            source="Gulf County Tax Deed Sale",
            source_url=SALES_URL,
            description=f"Official active Tax Deed case {case_number or 'unlisted'} for parcel {parcel_id}.",
            case_number=case_number,
            parcel_id=parcel_id,
            owner_name=owner_name,
            deposit_required=money(deposit_match.group(1)) if deposit_match else None,
        ))
    return properties
