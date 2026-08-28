#!/usr/bin/env python3
"""Refresh all supported official county tax deed feeds into one app dataset."""

from __future__ import annotations

import argparse
import csv
import io
import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Callable

import requests

from arkansas_tax_deed import CONTENTS_URL as ARKANSAS_CONTENTS_URL
from arkansas_tax_deed import fetch_upcoming as fetch_arkansas
from brevard_tax_deed import fetch_upcoming as fetch_brevard
from broward_tax_deed import fetch_upcoming as fetch_broward
from clerk_grid_tax_deed import CLERK_GRID_FEEDS, fetch_upcoming as fetch_clerk_grid
from collier_tax_deed import fetch_upcoming as fetch_collier
from gulf_tax_deed import fetch_upcoming as fetch_gulf
from new_mexico_tax_deed import AUCTIONS_URL as NEW_MEXICO_AUCTIONS_URL
from new_mexico_tax_deed import fetch_upcoming as fetch_new_mexico
from suwannee_tax_deed import fetch_upcoming as fetch_suwannee


FEEDS: list[tuple[str, str, str, str, Callable[[], list[dict]]]] = [
    ("arkansas-tax-deed-", "Arkansas statewide", "AR", ARKANSAS_CONTENTS_URL, fetch_arkansas),
    ("new-mexico-tax-deed-", "New Mexico statewide", "NM", NEW_MEXICO_AUCTIONS_URL, fetch_new_mexico),
    ("broward-tax-deed-", "Broward", "FL", "https://county-taxes.net/broward/reports/real-estate", fetch_broward),
    ("brevard-tax-deed-", "Brevard", "FL", "https://www.brevardclerk.us/tax-deed-sales", fetch_brevard),
    ("suwannee-tax-deed-", "Suwannee", "FL", "https://www.suwgov.org/tax-deed-sales/", fetch_suwannee),
    ("gulf-tax-deed-", "Gulf", "FL", "https://www.gulfclerk.com/courts/tax-deeds/", fetch_gulf),
    ("collier-tax-deed-", "Collier", "FL", "https://notices.collierclerk.com/genre/tax-deeds/", fetch_collier),
]
FEEDS.extend(
    (
        f"{config.slug}-tax-deed-",
        config.county,
        "FL",
        config.base_url,
        lambda config=config: fetch_clerk_grid(config),
    )
    for config in CLERK_GRID_FEEDS
)


def _read_existing(path: Path) -> list[dict]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def _geocode(properties: list[dict], existing: dict[str, dict]) -> None:
    pending: list[dict] = []
    for listing in properties:
        old = existing.get(listing["id"], {})
        if not listing.get("latitude") and old.get("latitude"):
            listing["latitude"] = old["latitude"]
            listing["longitude"] = old["longitude"]
        if listing.get("latitude") or listing.get("address", "").startswith("Parcel "):
            continue
        pending.append(listing)

    for start in range(0, len(pending), 500):
        batch = pending[start:start + 500]
        upload = io.StringIO()
        writer = csv.writer(upload)
        for listing in batch:
            writer.writerow([
                listing["id"], listing.get("address", ""), listing.get("city", ""),
                listing.get("state", ""), listing.get("zip", ""),
            ])
        try:
            response = requests.post(
                "https://geocoding.geo.census.gov/geocoder/geographies/addressbatch",
                files={"addressFile": ("addresses.csv", upload.getvalue(), "text/csv")},
                data={"benchmark": "Public_AR_Current", "vintage": "Current_Current"},
                headers={"User-Agent": "AuctionFlipper/1.0 public county auction index"},
                timeout=90,
            )
            response.raise_for_status()
            by_id = {listing["id"]: listing for listing in batch}
            for row in csv.reader(io.StringIO(response.text)):
                if len(row) < 6 or row[2].strip().lower() != "match":
                    continue
                longitude, latitude = row[5].split(",")
                listing = by_id.get(row[0])
                if listing:
                    listing["latitude"] = round(float(latitude), 7)
                    listing["longitude"] = round(float(longitude), 7)
        except (requests.RequestException, ValueError, IndexError):
            print("Census batch geocoding failed; address links remain available.")


def refresh(output: Path, metadata_output: Path) -> list[dict]:
    existing_records = _read_existing(output)
    existing = {record.get("id", ""): record for record in existing_records}
    current_date = date.today()
    properties: list[dict] = []
    source_metadata: list[dict] = []

    for prefix, county, state, url, fetcher in FEEDS:
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
            for record in records:
                record["sourceUrl"] = url
            status = "cached"
        properties.extend(records)
        source_metadata.append({
            "county": county,
            "state": state,
            "scope": "state" if county.endswith(" statewide") else "county",
            "url": url,
            "count": len(records),
            "status": status,
        })

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
