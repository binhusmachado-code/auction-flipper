#!/usr/bin/env python3
"""Fetch upcoming Broward County tax deed parcels from the official auction site."""

import argparse
import json
import re
from datetime import datetime
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://broward.deedauction.net"


def money(value: str) -> float:
    return float(re.sub(r"[^0-9.]", "", value) or 0)


def detail_fields(html: str) -> dict[str, str]:
    soup = BeautifulSoup(html, "html.parser")
    fields: dict[str, str] = {}
    for row in soup.select("tr"):
        cells = row.find_all("td")
        if len(cells) >= 2:
            fields[cells[0].get_text(" ", strip=True).rstrip(":")] = cells[1].get_text(" ", strip=True)
    return fields


def fetch_upcoming() -> list[dict]:
    session = requests.Session()
    session.headers.update({"User-Agent": "AuctionFlipper/1.0 (public county auction index)"})
    response = session.post(
        f"{BASE_URL}/auctions/upcoming",
        headers={"X-Requested-With": "XMLHttpRequest"},
        data={"draw": "1", "start": "0", "length": "100"},
        timeout=30,
    )
    response.raise_for_status()
    properties: list[dict] = []
    for auction in response.json().get("data", []):
        auction_id = str(auction["id"])
        auction_url = f"{BASE_URL}/auction/{auction_id}"
        page = session.get(auction_url, timeout=30)
        page.raise_for_status()
        soup = BeautifulSoup(page.text, "html.parser")
        sale_date = datetime.strptime(auction["batch_closing_start"][:10], "%Y-%m-%d").date().isoformat()
        for row in soup.select('tr[id$=".summary"]'):
            item_id = row.get("id", "").split(".")[0]
            cells = row.find_all("td")
            if len(cells) < 3 or not item_id:
                continue
            deed_number = cells[1].get_text(" ", strip=True)
            opening_bid = money(cells[2].get_text(" ", strip=True))
            details_response = session.get(
                f"{auction_url}/{item_id}/item_details",
                headers={"X-Requested-With": "XMLHttpRequest", "Referer": auction_url},
                timeout=30,
            )
            details_response.raise_for_status()
            details_json = details_response.json()
            details_html = next((v for k, v in details_json.items() if k.startswith("item_details.")), "")
            fields = detail_fields(details_html)
            parcel_id = fields.get("Parcel #", "")
            situs = fields.get("Situs Address", "")
            assessed_value = money(fields.get("Assessed / SOH Value", "0"))
            legal = fields.get("Legal", "")
            properties.append({
                "id": f"broward-tax-deed-{deed_number}", "address": situs or f"Parcel {parcel_id}",
                "city": "Broward County", "state": "FL", "zip": "", "price": opening_bid,
                "estimatedValue": 0, "beds": 0, "baths": 0, "sqft": 0, "propertyType": "Unknown",
                "auctionDate": sale_date, "auctionType": "Tax Deed",
                "source": "Broward County Tax Deed Auction", "sourceUrl": auction_url,
                "description": f"Official upcoming Tax Deed #{deed_number}. Legal description: {legal}",
                "imageUrl": "", "images": [], "status": "Active", "daysOnMarket": 0,
                "rehabEstimate": 0, "arv": 0,
                "notes": "Buyer beware: verify title, liens, occupancy, land use, condition, and current auction status before bidding.",
                "latitude": 0, "longitude": 0, "county": "Broward", "caseNumber": deed_number,
                "openingBid": opening_bid, "depositRequired": max(200, opening_bid * 0.05),
                "parcelId": parcel_id, "taxAmount": opening_bid, "interestRate": 0,
                "redemptionPeriod": 0, "saleType": "Tax Deed", "assessedValue": assessed_value,
                "delinquentYears": 0, "valuationVerified": False,
            })
    return properties


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="src/data/tax_deed_properties.json")
    args = parser.parse_args()
    properties = fetch_upcoming()
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(properties, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(properties)} upcoming Broward tax deed parcels to {output}")


if __name__ == "__main__":
    main()
