#!/usr/bin/env python3
"""Fetch upcoming Broward County tax deed parcels from the official auction site."""

import argparse
import json
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from shared import HEADERS, base_property, centroid, money, property_type

BASE_URL = "https://broward.deedauction.net"
PARCEL_LAYER = "https://gisweb-adapters.bcpa.net/arcgis/rest/services/BCPA_EXTERNAL_JAN26/MapServer/16"
ADDRESS_LOCATIONS = {
    "4274 NW 89 AVE": ("Coral Springs", "33065"),
    "4132 NW 88 AVE": ("Coral Springs", "33065"),
    "1201 SW 52 AVE": ("North Lauderdale", "33068"),
    "4771 NW 10 CT": ("Plantation", "33313"),
    "5864 NW 22 ST": ("Lauderhill", "33313"),
}


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
    session.headers.update(HEADERS)
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
            listing = base_property(
                property_id=f"broward-tax-deed-{deed_number}",
                address=situs or f"Parcel {parcel_id}",
                city="Broward County",
                county="Broward",
                price=opening_bid,
                auction_date=sale_date,
                source="Broward County Tax Deed Auction",
                source_url=auction_url,
                description=f"Official upcoming Tax Deed #{deed_number}. Legal description: {legal}",
                case_number=deed_number,
                parcel_id=parcel_id,
            )
            listing.update({
                "propertyType": property_type(legal),
                "assessedValue": assessed_value,
            })
            if situs in ADDRESS_LOCATIONS:
                listing["city"], listing["zip"] = ADDRESS_LOCATIONS[situs]
            properties.append(listing)

    numeric_folios = {
        str(property_["parcelId"]).replace("-", ""): property_
        for property_ in properties
        if str(property_["parcelId"]).replace("-", "").isdigit()
    }
    if numeric_folios:
        response = session.post(
            f"{PARCEL_LAYER}/query",
            data={
                "f": "json",
                "where": "FOLIO IN ({})".format(",".join(f"'{folio}'" for folio in numeric_folios)),
                "outFields": "FOLIO",
                "returnGeometry": "true",
                "outSR": "4326",
            },
            timeout=60,
        )
        response.raise_for_status()
        for feature in response.json().get("features", []):
            listing = numeric_folios.get(str(feature.get("attributes", {}).get("FOLIO", "")))
            if listing:
                listing["latitude"], listing["longitude"] = centroid(feature.get("geometry"))

    for listing in properties:
        folio = str(listing["parcelId"]).replace("-", "")
        record = session.get(f"https://bcpa.net/RecInfo.asp?URL_Folio={folio}", timeout=30)
        if record.ok:
            record_soup = BeautifulSoup(record.text, "html.parser")
            maps_link = record_soup.select_one('a[href*="google.com/maps/place"]')
            if maps_link:
                full_address = maps_link.get_text(" ", strip=True)
                location_match = re.search(r",\s*([^,]+?)\s+FL\s+(\d{5})", full_address, re.IGNORECASE)
                if location_match:
                    listing["city"] = location_match.group(1).strip().title()
                    listing["zip"] = location_match.group(2)
        photographs = session.get(f"https://bcpa.net/Photographs.asp?Folio={folio}", timeout=30)
        if photographs.ok:
            photograph_soup = BeautifulSoup(photographs.text, "html.parser")
            images = [
                urljoin(photographs.url, image.get("src", ""))
                for image in photograph_soup.select('img[src*="/Photographs/"]')
            ]
            if images:
                listing["imageUrl"] = images[0]
                listing["images"] = images
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
