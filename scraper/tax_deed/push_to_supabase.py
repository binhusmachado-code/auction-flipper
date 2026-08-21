#!/usr/bin/env python3
"""Upsert the normalized official tax deed dataset into the protected database."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests


def snake_record(record: dict[str, Any], verified_at: str | None) -> dict[str, Any]:
    mapping = {
        "estimatedValue": "estimated_value", "lotSize": "lot_size", "yearBuilt": "year_built",
        "propertyType": "property_type", "auctionDate": "auction_date", "auctionType": "auction_type",
        "sourceUrl": "source_url", "imageUrl": "image_url", "daysOnMarket": "days_on_market",
        "rehabEstimate": "rehab_estimate", "caseNumber": "case_number", "openingBid": "opening_bid",
        "depositRequired": "deposit_required", "parcelId": "parcel_id", "taxAmount": "tax_amount",
        "interestRate": "interest_rate", "redemptionPeriod": "redemption_period", "saleType": "sale_type",
        "assessedValue": "assessed_value", "delinquentYears": "delinquent_years", "ownerName": "owner_name",
        "valuationVerified": "valuation_verified",
    }
    allowed = {
        "id", "address", "city", "state", "zip", "county", "price", "opening_bid", "deposit_required",
        "assessed_value", "estimated_value", "valuation_verified", "property_type", "auction_type", "sale_type",
        "auction_date", "case_number", "parcel_id", "owner_name", "source", "source_url", "description",
        "image_url", "images", "status", "latitude", "longitude", "beds", "baths", "sqft", "lot_size",
        "year_built", "days_on_market", "rehab_estimate", "arv", "notes", "tax_amount", "interest_rate",
        "redemption_period", "delinquent_years",
    }
    normalized = {mapping.get(key, key): value for key, value in record.items()}
    result = {key: value for key, value in normalized.items() if key in allowed}
    if verified_at:
        result["source_verified_at"] = verified_at
    result["updated_at"] = datetime.now(timezone.utc).isoformat()
    return result


def push(data_path: Path, metadata_path: Path) -> int:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not service_key:
        print("Supabase import skipped: server credentials are not configured.")
        return 0

    records = json.loads(data_path.read_text(encoding="utf-8"))
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    verified_at = datetime.now(timezone.utc).isoformat()
    verified_counties = {
        source["county"] for source in metadata.get("sources", []) if source.get("status") == "verified"
    }
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }

    for start in range(0, len(records), 100):
        payload = [
            snake_record(item, verified_at if item.get("county") in verified_counties else None)
            for item in records[start:start + 100]
        ]
        response = requests.post(
            f"{url}/rest/v1/properties?on_conflict=id", headers=headers, json=payload, timeout=60,
        )
        response.raise_for_status()

    supported_counties = [source["county"] for source in metadata.get("sources", [])]
    existing_response = requests.get(
        f"{url}/rest/v1/properties",
        headers=headers,
        params={"select": "id", "sale_type": "eq.Tax Deed", "county": f"in.({','.join(supported_counties)})"},
        timeout=60,
    )
    existing_response.raise_for_status()
    current_ids = {record["id"] for record in records}
    missing_ids = [row["id"] for row in existing_response.json() if row["id"] not in current_ids]
    for start in range(0, len(missing_ids), 50):
        ids = missing_ids[start:start + 50]
        response = requests.patch(
            f"{url}/rest/v1/properties",
            headers=headers,
            params={"id": f"in.({','.join(ids)})"},
            json={"status": "Removed", "updated_at": verified_at},
            timeout=60,
        )
        response.raise_for_status()

    health = []
    for source in metadata.get("sources", []):
        status = "live" if source.get("status") == "verified" else "stale"
        health.append({
            "source_id": source["county"].lower().replace(" ", "-") + "-tax-deeds",
            "county": source["county"],
            "status": status,
            "record_count": source.get("count", 0),
            "last_attempt_at": verified_at,
            "last_success_at": verified_at if status == "live" else None,
            "updated_at": verified_at,
        })
    response = requests.post(
        f"{url}/rest/v1/source_health?on_conflict=source_id", headers=headers, json=health, timeout=60,
    )
    response.raise_for_status()
    print(f"Upserted {len(records)} official properties, marked {len(missing_ids)} removed, and updated {len(health)} sources.")
    return len(records)


if __name__ == "__main__":
    push(Path("src/data/tax_deed_properties.json"), Path("src/data/tax_deed_metadata.json"))
