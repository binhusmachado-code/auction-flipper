"""Shared helpers for official county tax deed feeds."""

from __future__ import annotations

import re
from typing import Any


HEADERS = {"User-Agent": "AuctionFlipper/1.0 (public county auction index)"}
BUYER_BEWARE = (
    "Buyer beware: verify title, surviving liens, occupancy, land use, condition, "
    "and current auction status before bidding."
)


def money(value: str | int | float | None) -> float:
    """Convert county-formatted currency text to a number."""
    return round(float(re.sub(r"[^0-9.]", "", str(value or "")) or 0), 2)


def centroid(geometry: dict[str, Any] | None) -> tuple[float, float]:
    """Return a stable visual center for an ArcGIS polygon."""
    points = [point for ring in (geometry or {}).get("rings", []) for point in ring]
    if not points:
        return 0, 0
    longitudes = [float(point[0]) for point in points]
    latitudes = [float(point[1]) for point in points]
    return round(sum(latitudes) / len(latitudes), 7), round(sum(longitudes) / len(longitudes), 7)


def property_type(description: str) -> str:
    """Map public land-use descriptions to the app's small property taxonomy."""
    value = description.upper()
    if "CONDO" in value:
        return "Condo"
    if "TOWNHOUSE" in value or "TOWN HOUSE" in value:
        return "Townhouse"
    if any(token in value for token in ("MULTI", "DUPLEX", "TRIPLEX", "APARTMENT")):
        return "Multi-Family"
    if any(token in value for token in ("VACANT", "TIMBER", "PASTURE", "GRAZING", "ACREAGE", "FOREST")):
        return "Land"
    if any(token in value for token in ("SINGLE FAMILY", "MOBILE HOME", "MANUFACTURED HOME")):
        return "Single Family"
    if any(token in value for token in ("COMMERCIAL", "OFFICE", "STORE", "RETAIL", "WAREHOUSE", "INDUSTRIAL")):
        return "Commercial"
    return "Unknown"


def base_property(
    *,
    property_id: str,
    address: str,
    city: str,
    county: str,
    price: float,
    auction_date: str,
    source: str,
    source_url: str,
    description: str,
    case_number: str,
    parcel_id: str,
    owner_name: str = "",
    deposit_required: float | None = None,
) -> dict[str, Any]:
    """Build a conservative listing without inventing market or building data."""
    opening_bid = money(price)
    return {
        "id": property_id,
        "address": address or f"Parcel {parcel_id}",
        "city": city or f"{county} County",
        "state": "FL",
        "zip": "",
        "price": opening_bid,
        "estimatedValue": 0,
        "beds": 0,
        "baths": 0,
        "sqft": 0,
        "propertyType": "Unknown",
        "auctionDate": auction_date,
        "auctionType": "Tax Deed",
        "source": source,
        "sourceUrl": source_url,
        "description": description,
        "imageUrl": "",
        "images": [],
        "status": "Active",
        "daysOnMarket": 0,
        "rehabEstimate": 0,
        "arv": 0,
        "notes": BUYER_BEWARE,
        "latitude": 0,
        "longitude": 0,
        "county": county,
        "caseNumber": case_number,
        "openingBid": opening_bid,
        "depositRequired": money(deposit_required if deposit_required is not None else max(200, opening_bid * 0.05)),
        "parcelId": parcel_id,
        "taxAmount": opening_bid,
        "interestRate": 0,
        "redemptionPeriod": 0,
        "saleType": "Tax Deed",
        "assessedValue": 0,
        "delinquentYears": 0,
        "ownerName": owner_name,
        "valuationVerified": False,
    }
