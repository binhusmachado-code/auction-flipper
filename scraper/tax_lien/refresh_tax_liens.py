#!/usr/bin/env python3
"""Refresh verified public tax lien inventories."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from adams_county import fetch_county_held


def _read_existing(path: Path) -> dict[str, dict]:
    try:
        return {record["id"]: record for record in json.loads(path.read_text(encoding="utf-8"))}
    except (FileNotFoundError, json.JSONDecodeError, KeyError, TypeError):
        return {}


def merge_existing_enrichment(record: dict, existing: dict | None) -> dict:
    if not existing:
        return record
    if record["address"].startswith("Account ") and not existing.get("address", "").startswith("Account "):
        record["address"] = existing["address"]
    if record["city"] == "Adams County" and existing.get("city"):
        record["city"] = existing["city"]
    for field in (
        "zip", "parcelId", "ownerName", "imageUrl", "images", "latitude", "longitude",
        "lotSize", "propertyType", "assessedValue", "estimatedValue", "arv", "valuationVerified",
    ):
        missing = record.get(field) in (None, "", 0, [], False) or (
            field == "propertyType" and record.get(field) == "Unknown"
        )
        if missing and existing.get(field) not in (None, "", 0, [], False):
            record[field] = existing[field]
    if "Legal description:" not in record.get("description", "") and "Legal description:" in existing.get("description", ""):
        legal = existing["description"].split("Legal description:", 1)[1]
        record["description"] += f" Legal description:{legal}"
    return record


def refresh(output: Path, metadata_output: Path) -> list[dict]:
    existing = _read_existing(output)
    records, source = fetch_county_held()
    records = [merge_existing_enrichment(record, existing.get(record["id"])) for record in records]
    if len(records) != len({record["id"] for record in records}):
        raise RuntimeError("Tax lien refresh returned duplicate IDs")
    source["matchedParcels"] = sum(bool(record["parcelId"]) for record in records)
    source["mappedParcels"] = sum(bool(record["latitude"]) for record in records)
    if source.get("assessorStatus") == "unavailable" and source["matchedParcels"]:
        source["assessorStatus"] = "cached"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(records, indent=2) + "\n", encoding="utf-8")
    metadata = {
        "refreshedAt": datetime.now(timezone.utc).isoformat(),
        "total": len(records),
        "sources": [source],
    }
    metadata_output.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    return records


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="src/data/tax_lien_properties.json")
    parser.add_argument("--metadata-output", default="src/data/tax_lien_metadata.json")
    args = parser.parse_args()
    records = refresh(Path(args.output), Path(args.metadata_output))
    print(f"Wrote {len(records)} verified county-held tax liens")


if __name__ == "__main__":
    main()
