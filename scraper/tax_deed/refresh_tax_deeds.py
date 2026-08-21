#!/usr/bin/env python3
"""Refresh all supported official county tax deed feeds into one app dataset."""

from __future__ import annotations

import argparse
import json
import time
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Callable

import requests

from brevard_tax_deed import fetch_upcoming as fetch_brevard
from broward_tax_deed import fetch_upcoming as fetch_broward
from gulf_tax_deed import fetch_upcoming as fetch_gulf
from suwannee_tax_deed import fetch_upcoming as fetch_suwannee


FEEDS: list[tuple[str, str, str, Callable[[], list[dict]]]] = [
    ("broward-tax-deed-", "Broward", "https://broward.deedauction.net/auctions", fetch_broward),
    ("brevard-tax-deed-", "Brevard", "https://www.brevardclerk.us/tax-deed-sales", fetch_brevard),
    ("suwannee-tax-deed-", "Suwannee", "https://www.suwgov.org/tax-deed-sales/", fetch_suwannee),
    ("gulf-tax-deed-", "Gulf", "https://www.gulfclerk.com/courts/tax-deeds/", fetch_gulf),
]


def _read_existing(path: Path) -> list[dict]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def _geocode(properties: list[dict], existing: dict[str, dict]) -> None:
    session = requests.Session()
    session.headers.update({
        "User-Agent": "AuctionFlipper/1.0 (public county auction index; github.com/binhusmachado-code/auction-flipper)"
    })
    for listing in properties:
        old = existing.get(listing["id"], {})
        if not listing.get("latitude") and old.get("latitude"):
            listing["latitude"] = old["latitude"]
            listing["longitude"] = old["longitude"]
        if listing.get("latitude") or listing.get("address", "").startswith("Parcel "):
            continue
        query = ", ".join(
            part for part in (
                listing.get("address", ""), listing.get("city", ""), listing.get("state", ""), listing.get("zip", "")
            ) if part
        )
        try:
            response = session.get(
                "https://nominatim.openstreetmap.org/search",
                params={"q": query, "format": "jsonv2", "limit": 1, "countrycodes": "us"},
                timeout=30,
            )
            response.raise_for_status()
            matches = response.json()
            if matches:
                listing["latitude"] = round(float(matches[0]["lat"]), 7)
                listing["longitude"] = round(float(matches[0]["lon"]), 7)
        except (requests.RequestException, ValueError, KeyError):
            pass
        time.sleep(1.05)


def refresh(output: Path, metadata_output: Path) -> list[dict]:
    existing_records = _read_existing(output)
    existing = {record.get("id", ""): record for record in existing_records}
    current_date = date.today()
    properties: list[dict] = []
    source_metadata: list[dict] = []

    for prefix, county, url, fetcher in FEEDS:
        try:
            records = fetcher()
            status = "verified"
        except Exception as exc:  # Keep the last future snapshot when one county is temporarily down.
            print(f"{county} refresh failed: {exc}")
            records = [
                record for record in existing_records
                if str(record.get("id", "")).startswith(prefix)
                and str(record.get("auctionDate", "")) >= current_date.isoformat()
            ]
            status = "cached"
        properties.extend(records)
        source_metadata.append({"county": county, "url": url, "count": len(records), "status": status})

    _geocode(properties, existing)
    properties.sort(key=lambda item: (item.get("auctionDate", "9999-12-31"), item.get("county", ""), item.get("id", "")))
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(properties, indent=2) + "\n", encoding="utf-8")

    metadata = {
        "refreshedAt": datetime.now(timezone.utc).date().isoformat(),
        "total": len(properties),
        "sources": source_metadata,
    }
    metadata_output.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    return properties


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="src/data/tax_deed_properties.json")
    parser.add_argument("--metadata-output", default="src/data/tax_deed_metadata.json")
    args = parser.parse_args()
    properties = refresh(Path(args.output), Path(args.metadata_output))
    counts: dict[str, int] = {}
    for listing in properties:
        counts[listing["county"]] = counts.get(listing["county"], 0) + 1
    print(f"Wrote {len(properties)} future tax deed listings: {counts}")


if __name__ == "__main__":
    main()
