#!/usr/bin/env python3
"""
GSA Auctions Scraper
Fetches real property listings from GSA Auctions (gsaauctions.gov) via the official public API.

Endpoint: https://api.gsa.gov/assets/gsaauctions/v2/auctions
Docs: https://gsa.github.io/auctions_api/

Usage:
    python3 gsa_scraper.py                    # Fetch and filter for real estate
    python3 gsa_scraper.py --all              # Return ALL auction items (not just real estate)
    python3 gsa_scraper.py --output gsa.json  # Save to specific file
    python3 gsa_scraper.py --limit 100        # Fetch up to 100 items
"""

import json
import time
import argparse
import re
import os
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict

import requests


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

GSA_API_BASE = "https://api.gsa.gov/assets/gsaauctions/v2/auctions"
GSA_WEB_BASE = "https://www.gsaauctions.gov"
API_KEY = "DEMO_KEY"  # Register at api.data.gov for a production key
RATE_LIMIT_CALLS = 5
RATE_LIMIT_WINDOW = 5  # seconds

# Only genuine real-property types found in the GSA Auctions API.
# The GSA Auctions API is ~95% personal property (vehicles, aircraft,
# equipment, furniture).  The only real property it contains are
# manufactured homes / travel trailers (e.g. FEMA surplus).
REAL_ESTATE_KEYWORDS = [
    "manufactured home",
    "travel trailer",
    "modular housing",
    "mobile home",
    "real property",
    "real estate",
]

# Keywords that strongly indicate personal property (NOT real estate).
# This list is intentionally exhaustive to prevent vehicles, aircraft,
# and equipment from slipping through.
PERSONAL_PROPERTY_KEYWORDS = [
    "aircraft", "plane", "helicopter", "jet", "airplane",
    "vehicle", "truck", "car ", "automobile", "van ", "suv", "pickup",
    "boat ", "vessel", "barge", "watercraft",
    "tire", "wheel", "engine", "motor", "transmission",
    "microwave", "refrigerator", "oven", "stove", "dishwasher", "freezer",
    "canteen", "boots", "uniform", "clothing", "apparel", "footwear",
    "desk", "chair", "table", "cabinet", "filing cabinet", "bookshelf",
    "computer", "laptop", "monitor", "printer", "server", "router", "switch",
    "tool", "drill", "saw", "welder", "compressor", "grinder",
    "cable", "wire", "hose", "pipe", "tubing",
    "pallet", "crate", "box ", "cases", "container", "drum",
    "scrap metal", "metal ", "steel ", "aluminum", "iron", "copper",
    "furniture", "fixture", "equipment", "machinery", "appliance",
    "mfg", "manufactured by", "model:", "mdl:", "serial", "sn:", "vin ", "vin:", "year:", "yr:", "make:", "mfg:", "manuf:", "manufacturer:", "oem",
    "unused", "used ", "open box", "original box", "new in box", "like new", "excellent condition", "good condition",
    "each", " ea.", " ea ", " e/a", "quantity", "qty", "qnty", "qty:", "count",
    "lot (", "lot of", "1 lot", "2 lot", "3 lot", "4 lot", "5 lot", "6 lot", "7 lot", "8 lot", "9 lot",
    "shipping wt", "shipping weight", "est shipping", "weight:", "wt:", "lbs", "pounds", "kg", "kilograms",
    "display", "exhibit", "sign", "banner", "poster", "flag",
    "forklift", "crane", "generator", "pump", "blower", "fan", "heater", "ac unit", "air conditioner", "chiller",
    "tractor", "mower", "loader", "excavator", "bulldozer", "backhoe", "skid steer",
    "gse", "ground support", "aerial lift", "scissor lift", "man lift",
    "fork lift", "pallet jack", "hand truck", "dolly",
    "fleet", "convoy", "sedan", "coupe", "hatchback", "wagon", "minivan",
    "ambulance", "bus", "coach", "shuttle", "utility vehicle", "atv", "utv", "golf cart",
    "trailer (", "trailer.", "trailer,", "semi trailer", "flatbed trailer", "cargo trailer", "utility trailer", "tank trailer",
    "aviation", "aero", "airframe", "fuselage", "propeller", "turbine",
    "hydraulic", "pneumatic", "electrical", "mechanical", "component", "assembly", "subassembly",
    "hardware", "fastener", "bolt", "nut", "screw", "washer", "rivet",
    "battery", "cell", "power supply", "inverter", "converter", "transformer",
    "electronics", "electronic", "communication", "radio", "transmitter", "receiver", "antenna",
    "medical", "dental", "optical", "laboratory", "lab ", "test equipment", "calibration",
    "camera", "surveillance", "security", "sensor", "detector",
    "carpet", "tile", "flooring", "curtain", "blind", "shade",
    "locker", "shelf", "rack", "bin", "drawer",
    "mat", "pad", "cover", "tarp", "tent", "canopy",
    "cooler", "refrigeration", "hvac", "ventilation", "duct",
    "fuel", "gasoline", "diesel", "propane", "oil", "lubricant",
    "fire", "extinguisher", "alarm", "sprinkler", "suppression",
    "rope", "chain", "strap", "belt", "harness", "rigging",
    "barrel", "tank", "cylinder", "keg", "carboy", "ibc",
    "piano", "organ", "gym ", "fitness", "exercise", "sport",
    "stage", "platform", "bleacher", "grandstand",
    "tractor trailer", "tow truck", "wrecker", "dump truck", "cement mixer", "concrete mixer",
    "crane truck", "bucket truck", "boom truck", "utility truck", "service truck",
    "fire truck", "engine ", "ladder truck", "pumper", "tanker",
    "motorcycle", "moped", "scooter", "bike ", "bicycle",
    "trailerable", "towable", "hitch", "ball mount",
    "compressor", "dryer", "washer", "dishmachine", "ice machine",
    "x-ray", "mri", "ct scan", "ultrasound", "dental chair",
    "projection", "projector", "screen", "whiteboard", "chalkboard",
    "telephone", "phone", "intercom", "pa system", "public address",
    "fork", "knife", "spoon", "plate", "bowl", "cup", "glass", "mug",
    "cookware", "bakeware", "utensil", "appliance",
    "podium", "lectern", "easel", "flip chart",
    "microscope", "centrifuge", "incubator", "autoclave", "spectrophotometer",
    "oscilloscope", "multimeter", "power meter", "signal generator",
    "solder", "flux", "paste", "adhesive", "sealant", "lubricant",
    "grease", "oil filter", "air filter", "fuel filter", "spark plug",
    "tire chain", "snow chain", "cable chain", "studded",
    "navigation", "gps", "radar", "sonar", "lidar", "transponder",
    "parachute", "ejection", "seat", "life raft", "life vest", "flotation",
    "ordnance", "ammunition", "weapon", "firearm", "gun ", "rifle", "pistol",
    "night vision", "thermal", "infrared", "laser", "optics", "scope",
    "drone", "uav", "unmanned", "robot", "robotic", "autonomous",
    "simulator", "trainer", "mockup", "mock-up", "replica", "model ",
    "camper", "rv ", "recreational vehicle", "motorhome", "fifth wheel",
    "bus ", "school bus", "transit bus", "coach bus", "minibus",
    "vanpool", "carpool", "rideshare",
    "cart", "golf cart", "utility cart", "luggage cart", "food cart",
    "trailer -", "trailer.", "trailer,", "trailer (", "trailer:"
]

# Known surplus property center address fragments to exclude
SURPLUS_CENTER_FRAGMENTS = [
    "federal surplus property",
    "state surplus property",
    "surplus property center",
    "surplus warehouse",
]

# Patterns to extract beds / baths / sqft from free-text descriptions
BED_PATTERNS = [
    re.compile(r"(\d+)\s*bed", re.IGNORECASE),
    re.compile(r"(\d+)\s*br", re.IGNORECASE),
    re.compile(r"(\d+)\s*bedroom", re.IGNORECASE),
]
BATH_PATTERNS = [
    re.compile(r"(\d+(?:\.\d+)?)\s*bath", re.IGNORECASE),
    re.compile(r"(\d+(?:\.\d+)?)\s*ba", re.IGNORECASE),
]
SQFT_PATTERNS = [
    re.compile(r"(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*sq\.?\s*ft", re.IGNORECASE),
    re.compile(r"(\d{1,3}(?:,\d{3})*)\s*square\s*feet", re.IGNORECASE),
    re.compile(r"(\d+(?:\.\d+)?)\s*sf", re.IGNORECASE),
]
ACRE_PATTERNS = [
    re.compile(r"(\d+(?:\.\d+)?)\s*acre", re.IGNORECASE),
]


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class ScrapedProperty:
    id: str
    address: str
    city: str
    state: str
    zip: str
    price: int
    estimated_value: int
    beds: int
    baths: float
    sqft: int
    property_type: str
    auction_date: Optional[str]
    auction_type: str
    source: str
    source_url: str
    description: str
    image_url: str
    status: str = "Active"
    latitude: float = 0.0
    longitude: float = 0.0
    lot_size: Optional[float] = None
    year_built: Optional[int] = None
    notes: str = ""
    raw_data: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        return d


# ---------------------------------------------------------------------------
# Scraper
# ---------------------------------------------------------------------------

class GSAScraper:
    """Scraper for GSA Auctions using the official public API."""

    USER_AGENT = (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    )

    def __init__(self, api_key: str = API_KEY, delay: float = 1.0):
        self.api_key = api_key
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": self.USER_AGENT,
            "Accept": "application/json",
        })
        self._last_call_time = 0.0

    def _rate_limit(self):
        """Respect GSA rate limit: 5 calls per 5 seconds."""
        elapsed = time.time() - self._last_call_time
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)
        self._last_call_time = time.time()

    def _get(self, url: str, **kwargs) -> requests.Response:
        self._rate_limit()
        return self.session.get(url, timeout=30, **kwargs)

    def fetch_auctions(self, limit: int = 200) -> List[Dict[str, Any]]:
        """
        Fetch raw auction listings from the GSA API.
        The API returns all listings; pagination is not documented,
        so we fetch in batches if needed.
        """
        auctions = []
        offset = 0
        batch = 50  # conservative batch size

        while len(auctions) < limit:
            params = {
                "api_key": self.api_key,
                "format": "JSON",
                "limit": min(batch, limit - len(auctions)),
                "offset": offset,
            }
            url = f"{GSA_API_BASE}"
            print(f"   → Fetching batch offset={offset} ...")

            try:
                resp = self._get(url, params=params)
            except requests.RequestException as e:
                print(f"   ⚠️  Network error: {e}")
                break

            if resp.status_code == 429:
                print("   ⚠️  Rate limited. Waiting 10s ...")
                time.sleep(10)
                continue

            if resp.status_code != 200:
                print(f"   ⚠️  HTTP {resp.status_code}: {resp.text[:200]}")
                break

            try:
                data = resp.json()
            except json.JSONDecodeError as e:
                print(f"   ⚠️  JSON decode error: {e}")
                break

            batch_results = data.get("Results", [])
            if not batch_results:
                print("   ℹ️  No more results from API.")
                break

            auctions.extend(batch_results)
            offset += len(batch_results)

            # If we got fewer results than requested, we've reached the end
            if len(batch_results) < batch:
                break

        return auctions

    def _strip_html(self, text: str) -> str:
        """Remove HTML tags from text."""
        return re.sub(r'<[^>]+>', ' ', text)

    def _word_match(self, text: str, keyword: str) -> bool:
        """Check if keyword appears as a whole word/phrase in text."""
        escaped = re.escape(keyword)
        return bool(re.search(r'\b' + escaped + r'\b', text, re.IGNORECASE))

    def is_real_estate(self, item: Dict[str, Any]) -> bool:
        """
        Heuristic: decide whether an auction item is real property.
        Uses both positive (must match) and negative (must NOT match) keywords.
        """
        item_name_raw = (item.get("itemName", "") or "").lower()
        lot_info_raw = (item.get("lotInfo", "") or "").lower()
        addr1 = (item.get("propertyAddr1", "") or "").lower()
        addr3 = (item.get("propertyAddr3", "") or "").lower()

        # Strip HTML so we don't match inside tags/attributes
        lot_info = self._strip_html(lot_info_raw)
        item_name = self._strip_html(item_name_raw)

        full_text = f"{item_name} {lot_info}"

        # 1. Strong exclusion on item name: if the title itself is personal property, reject
        for neg in PERSONAL_PROPERTY_KEYWORDS:
            if self._word_match(item_name, neg):
                return False

        # 2. Exclude items from known surplus property centers
        combined_addr = f"{addr1} {addr3}"
        for frag in SURPLUS_CENTER_FRAGMENTS:
            if frag.lower() in combined_addr:
                return False

        # 3. Check item name FIRST for real-estate keywords — item names are authoritative
        name_has_positive = any(
            self._word_match(item_name, kw) for kw in REAL_ESTATE_KEYWORDS
        )
        if name_has_positive:
            return True

        # 4. If item name is neutral, check the full description with both positive and negative
        for neg in PERSONAL_PROPERTY_KEYWORDS:
            if self._word_match(full_text, neg):
                return False

        has_positive = any(
            self._word_match(full_text, kw) for kw in REAL_ESTATE_KEYWORDS
        )
        return has_positive
        """
        Heuristic: decide whether an auction item is real property.
        Uses both positive (must match) and negative (must NOT match) keywords.
        """
        item_name = (item.get("itemName", "") or "").lower()
        lot_info = (item.get("lotInfo", "") or "").lower()
        addr1 = (item.get("propertyAddr1", "") or "").lower()
        addr3 = (item.get("propertyAddr3", "") or "").lower()
        full_text = f"{item_name} {lot_info}"

        # 1. Strong exclusion: if any personal-property keyword matches, reject
        for neg in PERSONAL_PROPERTY_KEYWORDS:
            if neg.lower() in full_text:
                return False

        # 2. Exclude items from known surplus property centers
        combined_addr = f"{addr1} {addr3}"
        for frag in SURPLUS_CENTER_FRAGMENTS:
            if frag.lower() in combined_addr:
                return False

        # 3. Require at least one positive real-estate keyword
        has_positive = any(kw.lower() in full_text for kw in REAL_ESTATE_KEYWORDS)
        if not has_positive:
            return False

        return True

    def _extract_beds(self, text: str) -> int:
        for pat in BED_PATTERNS:
            m = pat.search(text)
            if m:
                return int(m.group(1))
        return 0

    def _extract_baths(self, text: str) -> float:
        for pat in BATH_PATTERNS:
            m = pat.search(text)
            if m:
                return float(m.group(1))
        return 0.0

    def _extract_sqft(self, text: str) -> int:
        for pat in SQFT_PATTERNS:
            m = pat.search(text)
            if m:
                return int(m.group(1).replace(",", "").replace(".", ""))
        return 0

    def _extract_acres(self, text: str) -> Optional[float]:
        for pat in ACRE_PATTERNS:
            m = pat.search(text)
            if m:
                return float(m.group(1))
        return None

    def _build_address(self, item: Dict[str, Any]) -> str:
        """Build a street address from the GSA address fields."""
        parts = [
            item.get("propertyAddr3", ""),
            item.get("propertyAddr2", ""),
            item.get("propertyAddr1", ""),
        ]
        # Filter out agency names and empty strings
        cleaned = []
        for p in parts:
            p = (p or "").strip()
            if p and p.upper() not in ("NULL", "NONE", "N/A"):
                cleaned.append(p)
        # Try to find the one that looks most like a street address
        for p in cleaned:
            if re.search(r"\d+\s+\w", p):  # has a number followed by word
                return p
        return cleaned[0] if cleaned else "Address not available"

    def _parse_property_type(self, item: Dict[str, Any]) -> str:
        """Guess property type from item name and description."""
        text = f"{item.get('itemName', '')} {item.get('lotInfo', '')}".lower()

        if any(w in text for w in ("manufactured home", "mobile home", "modular housing")):
            return "Manufactured Home"
        if any(w in text for w in ("travel trailer", "trailer")):
            return "Travel Trailer"
        if any(w in text for w in ("residential", "house", "home", "duplex", "triplex", "housing unit", "dormitory", "barrack")):
            return "Residential"
        if any(w in text for w in ("commercial", "office", "retail", "industrial")):
            return "Commercial"
        if any(w in text for w in ("warehouse", "storage building")):
            return "Warehouse"
        if any(w in text for w in ("land", "vacant", "acre", "parcel", "tract")):
            return "Land"
        if any(w in text for w in ("apartment", "condo", "townhouse")):
            return "Multi-Family"
        if any(w in text for w in ("building", "structure", "facility")):
            return "Building"
        if any(w in text for w in ("camp ", "station ", "depot ")):
            return "Government Facility"
        return "Unknown"

    def _parse_price(self, item: Dict[str, Any]) -> int:
        """Return the best available price figure."""
        high_bid = item.get("highBidAmount")
        if high_bid is not None:
            return int(high_bid)
        reserve = item.get("reserve")
        if reserve is not None:
            return int(reserve)
        return 0

    def _parse_auction_date(self, item: Dict[str, Any]) -> Optional[str]:
        """Return the auction end date (the date bidding closes)."""
        end_dt = item.get("aucEndDt")
        if end_dt and end_dt.strip():
            # GSA returns YYYY-MM-DD
            return end_dt.strip()
        start_dt = item.get("aucStartDt")
        if start_dt and start_dt.strip():
            return start_dt.strip()
        return None

    def _build_description(self, item: Dict[str, Any]) -> str:
        """Build a clean description from the lot info."""
        lot_info = item.get("lotInfo", "") or ""
        # Replace excessive newlines
        lot_info = re.sub(r"\n+", " ", lot_info)
        lot_info = re.sub(r"\s+", " ", lot_info).strip()
        # Truncate if too long
        if len(lot_info) > 800:
            lot_info = lot_info[:797] + "..."
        return lot_info

    def parse_item(self, item: Dict[str, Any]) -> Optional[ScrapedProperty]:
        """Convert a raw GSA API item into our ScrapedProperty model."""
        sale_no = item.get("saleNo", "")
        lot_no = item.get("lotNo", "")
        if not sale_no:
            return None

        unique_id = f"{sale_no}-{lot_no}".replace(" ", "")
        address = self._build_address(item)
        city = (item.get("propertyCity") or "").strip()
        state = (item.get("propertyState") or "").strip()
        zip_code = (item.get("propertyZip") or "").strip()
        # Clean zip (sometimes has 'null' appended)
        zip_code = zip_code.replace("null", "").replace("NULL", "").strip()[:5]

        text_for_extraction = f"{item.get('itemName', '')} {item.get('lotInfo', '')}"

        price = self._parse_price(item)
        estimated = 0
        beds = self._extract_beds(text_for_extraction)
        baths = self._extract_baths(text_for_extraction)
        sqft = self._extract_sqft(text_for_extraction)
        lot_size = self._extract_acres(text_for_extraction)

        prop_type = self._parse_property_type(item)
        auction_date = self._parse_auction_date(item)
        description = self._build_description(item)
        item_url = item.get("itemDescURL", "")
        image_url = item.get("imageURL", "")
        status = "Active" if (item.get("auctionStatus") or "").lower() == "active" else "Preview"

        return ScrapedProperty(
            id=f"gsa-{unique_id}",
            address=address,
            city=city or "Unknown",
            state=state or "",
            zip=zip_code or "",
            price=price,
            estimated_value=estimated,
            beds=beds,
            baths=baths,
            sqft=sqft,
            property_type=prop_type,
            auction_date=auction_date,
            auction_type="Government",
            source="GSA Auctions",
            source_url=item_url or GSA_WEB_BASE,
            description=description,
            image_url=image_url or "",
            status=status,
            latitude=0.0,
            longitude=0.0,
            lot_size=lot_size,
            notes=f"GSA Sale {sale_no}, Lot {lot_no}. Agency: {item.get('agencyName', 'Unknown')}",
            raw_data=item,
        )

    def scrape(self, limit: int = 200, real_estate_only: bool = True) -> List[ScrapedProperty]:
        """
        Main entry point.

        Args:
            limit: Maximum total auctions to fetch from the API.
            real_estate_only: If True, filter results to items that look like real property.
        """
        print(f"🌐 Fetching up to {limit} auctions from GSA Auctions API ...")
        raw_items = self.fetch_auctions(limit=limit)
        print(f"📋 Retrieved {len(raw_items)} total auction items")

        properties = []
        skipped = 0
        for item in raw_items:
            try:
                if real_estate_only and not self.is_real_estate(item):
                    skipped += 1
                    continue

                prop = self.parse_item(item)
                if prop:
                    properties.append(prop)
            except Exception as e:
                print(f"   ⚠️  Error parsing item {item.get('saleNo')}: {e}")
                continue

        print(f"✅ Parsed {len(properties)} properties ({skipped} non-real-estate items skipped)")
        return properties


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def save_properties(properties: List[ScrapedProperty], output_path: str):
    """Save properties to JSON."""
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)

    data = [p.to_dict() for p in properties]
    with open(output, "w") as f:
        json.dump(data, f, indent=2)

    print(f"💾 Saved {len(data)} properties to {output_path}")


def print_summary(properties: List[ScrapedProperty]):
    """Print a human-readable summary."""
    print("\n" + "=" * 60)
    print(f"📊 GSA Auctions Scraper Summary")
    print("=" * 60)
    print(f"Total properties: {len(properties)}")

    if not properties:
        print("⚠️  No properties found.")
        return

    # Group by state
    by_state: Dict[str, int] = {}
    by_type: Dict[str, int] = {}
    for p in properties:
        by_state[p.state] = by_state.get(p.state, 0) + 1
        by_type[p.property_type] = by_type.get(p.property_type, 0) + 1

    print(f"\n📍 By State:")
    for state, count in sorted(by_state.items(), key=lambda x: -x[1])[:10]:
        print(f"   {state}: {count}")

    print(f"\n🏠 By Property Type:")
    for ptype, count in sorted(by_type.items(), key=lambda x: -x[1]):
        print(f"   {ptype}: {count}")

    print(f"\n🔍 Sample Listings:")
    for p in properties[:5]:
        print(f"\n   📌 {p.address}, {p.city}, {p.state} {p.zip}")
        print(f"      Type: {p.property_type} | Price: ${p.price:,} | Est: ${p.estimated_value:,}")
        print(f"      Auction: {p.auction_date or 'TBD'} | Status: {p.status}")
        print(f"      URL: {p.source_url}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="GSA Auctions Property Scraper")
    parser.add_argument("--output", "-o", default="gsa_properties.json", help="Output JSON file path")
    parser.add_argument("--limit", "-l", type=int, default=200, help="Max auctions to fetch from API")
    parser.add_argument("--all", "-a", action="store_true", help="Return ALL items, not just real estate")
    parser.add_argument("--api-key", default=API_KEY, help="GSA API key (get one at api.data.gov)")
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between API calls")
    args = parser.parse_args()

    print("=" * 60)
    print("🏛️  GSA Auctions Scraper")
    print("=" * 60)
    print(f"API Endpoint: {GSA_API_BASE}")
    print(f"Mode: {'All items' if args.all else 'Real estate only'}")
    print()

    scraper = GSAScraper(api_key=args.api_key, delay=args.delay)
    properties = scraper.scrape(limit=args.limit, real_estate_only=not args.all)

    if properties:
        save_properties(properties, args.output)

    print_summary(properties)

    print("\n" + "=" * 60)
    print("✅ Done!")
    print("=" * 60)


if __name__ == "__main__":
    main()
