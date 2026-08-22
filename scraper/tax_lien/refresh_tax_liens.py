#!/usr/bin/env python3
"""Refresh verified public tax lien inventories."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from adams_county import fetch_county_held


def refresh(output: Path, metadata_output: Path) -> list[dict]:
    records, source = fetch_county_held()
    if len(records) != len({record["id"] for record in records}):
        raise RuntimeError("Tax lien refresh returned duplicate IDs")
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
