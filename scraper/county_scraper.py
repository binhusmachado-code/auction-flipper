#!/usr/bin/env python3
"""
County Courthouse Foreclosure Scraper

Fetches REAL foreclosure and pre-foreclosure property data from free US public sources.
Primary source: RealtyTrac (Next.js server-rendered data with real property records)

Usage:
    python3 county_scraper.py              # Scrape and save to default output
    python3 county_scraper.py --output ./data/foreclosures.json
    python3 county_scraper.py --verbose
"""

import argparse
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests


# ── Constants ────────────────────────────────────────────────────────────────

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.realtytrac.com/",
}

REALTYTRAC_BASE = "https://www.realtytrac.com"

PROPERTY_TYPE_MAP = {
    "SFR": "Single Family",
    "C/T": "Condo/Townhouse",
    "CONDO": "Condo",
    "TOWNHOUSE": "Townhouse",
    "MULTI": "Multi-Family",
    "LAND": "Land",
    "COMM": "Commercial",
}


# ── Data Model ───────────────────────────────────────────────────────────────

def make_property_record(
    source_id: str,
    address: str,
    city: str,
    state: str,
    zip_code: str,
    price: int,
    estimated_value: int,
    beds: int,
    baths: float,
    sqft: int,
    property_type: str,
    auction_date: Optional[str],
    source: str,
    source_url: str,
    description: str,
    image_url: str,
    status: str,
    latitude: float,
    longitude: float,
    county: str = "",
    case_number: Optional[str] = None,
    lot_size: Optional[int] = None,
    year_built: Optional[int] = None,
    roi: Optional[float] = None,
) -> Dict[str, Any]:
    """Return a property record in the target schema."""
    return {
        "id": f"county-{source_id}",
        "address": address,
        "city": city,
        "state": state,
        "zip": zip_code,
        "price": price,
        "estimated_value": estimated_value,
        "beds": beds,
        "baths": baths,
        "sqft": sqft,
        "property_type": property_type,
        "auction_date": auction_date,
        "auction_type": "Foreclosure",
        "source": source,
        "source_url": source_url,
        "description": description,
        "image_url": image_url,
        "status": status,
        "latitude": latitude,
        "longitude": longitude,
        "county": county,
        "case_number": case_number,
        "lot_size": lot_size,
        "year_built": year_built,
        "roi": roi,
    }


# ── Scraper Core ─────────────────────────────────────────────────────────────

class CountyScraper:
    """Scraper that extracts real foreclosure data from public sources."""

    def __init__(self, delay: float = 1.5, verbose: bool = False):
        self.delay = delay
        self.verbose = verbose
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def _log(self, message: str) -> None:
        if self.verbose:
            print(message)

    def _get(self, url: str) -> Optional[requests.Response]:
        """Make a GET request with polite delay."""
        time.sleep(self.delay)
        try:
            resp = self.session.get(url, timeout=30, allow_redirects=True)
            self._log(f"   [{resp.status_code}] {url}")
            return resp
        except requests.RequestException as exc:
            self._log(f"   Request failed: {exc}")
            return None

    @staticmethod
    def _extract_next_data(html: str) -> Optional[Dict[str, Any]]:
        """Parse __NEXT_DATA__ JSON from a Next.js page."""
        match = re.search(
            r'<script id="__NEXT_DATA__" type="application/json">(.+?)</script>',
            html,
            re.DOTALL,
        )
        if not match:
            return None
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            return None

    @staticmethod
    def _ms_to_date(ms: Optional[int]) -> Optional[str]:
        """Convert millisecond timestamp to ISO date string."""
        if not ms:
            return None
        try:
            dt = datetime.fromtimestamp(ms / 1000, tz=timezone.utc)
            return dt.strftime("%Y-%m-%d")
        except (OSError, ValueError, OverflowError):
            return None

    @staticmethod
    def _map_property_type(code: str) -> str:
        """Map RealtyTrac type codes to readable property types."""
        if not code:
            return "Unknown"
        upper = code.strip().upper()
        return PROPERTY_TYPE_MAP.get(upper, upper)

    @staticmethod
    def _derive_price(item: Dict[str, Any]) -> int:
        """Derive a listing/auction price from RealtyTrac data.

        For pre-foreclosures there is no fixed auction price yet.
        We use the last known sale price if available, otherwise
        estimate at 60 % of estimated market value (typical
        foreclosure discount range).
        """
        sold = item.get("recently_sold_price")
        if isinstance(sold, (int, float)) and sold > 0:
            return int(sold)

        value = item.get("value")
        if isinstance(value, (int, float)) and value > 0:
            return int(value * 0.60)

        return 0

    def _parse_realtytrac_property(self, item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Convert a single RealtyTrac property dict to our schema."""
        addr = item.get("addr", "").strip()
        if not addr:
            return None

        city = item.get("city", "").strip()
        state = item.get("state", "").strip()
        zip_code = str(item.get("zip", "")).strip()

        # Skip properties without a valid US state
        if len(state) != 2:
            return None

        # Price logic
        price = self._derive_price(item)
        estimated = item.get("value") or 0
        if isinstance(estimated, (int, float)):
            estimated = int(estimated)
        else:
            estimated = 0

        # Beds / baths / sqft
        beds = item.get("beds") or 0
        baths = item.get("baths") or 0
        sqft = item.get("sqft") or 0

        # Coordinates
        coord = item.get("coord", {})
        lat = coord.get("lat", 0.0) if isinstance(coord, dict) else 0.0
        lon = coord.get("lon", 0.0) if isinstance(coord, dict) else 0.0

        # Status
        status_obj = item.get("status", {})
        if isinstance(status_obj, dict):
            is_pre = status_obj.get("preForeclosure", False)
            is_bank = status_obj.get("bankOwned", False)
            is_auction = status_obj.get("auction", False)
            is_sold = status_obj.get("recentlySold", False)
            roi = status_obj.get("roi")
        else:
            is_pre = is_bank = is_auction = is_sold = False
            roi = None

        if is_pre:
            status_label = "Pre-Foreclosure"
        elif is_bank:
            status_label = "Bank Owned"
        elif is_auction:
            status_label = "Auction"
        elif is_sold:
            status_label = "Recently Sold"
        else:
            status_label = "Active"

        # Dates
        auction_date = self._ms_to_date(item.get("statusDate"))

        # Property type
        prop_type = self._map_property_type(item.get("type", ""))

        # Image
        image_url = item.get("imageUrl") or item.get("bingPhotoUrl") or ""
        if not image_url or "fallback" in image_url.lower():
            image_url = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"

        # Description
        desc_parts = [f"{status_label} property in {city}, {state}."]
        if estimated > 0 and price > 0:
            discount = ((estimated - price) / max(estimated, 1)) * 100
            desc_parts.append(f"Listed at ${price:,}. Estimated value ${estimated:,}. Discount {discount:.0f}%.")
        elif estimated > 0:
            desc_parts.append(f"Estimated value ${estimated:,}.")
        if roi is not None:
            desc_parts.append(f"ROI indicator: {roi:.2f}%.")
        description = " ".join(desc_parts)

        source_url = f"{REALTYTRAC_BASE}/foreclosure/property/{item.get('id', '')}"

        return make_property_record(
            source_id=str(item.get("id", hash(addr) & 0xFFFFFFFF)),
            address=addr,
            city=city,
            state=state,
            zip_code=zip_code,
            price=price,
            estimated_value=estimated,
            beds=int(beds) if beds else 0,
            baths=float(baths) if baths else 0.0,
            sqft=int(sqft) if sqft else 0,
            property_type=prop_type,
            auction_date=auction_date,
            source="RealtyTrac / County Records",
            source_url=source_url,
            description=description,
            image_url=image_url,
            status="Active",
            latitude=float(lat) if lat else 0.0,
            longitude=float(lon) if lon else 0.0,
            county=item.get("county", ""),
            lot_size=item.get("lotSqft"),
            roi=roi,
        )

    def scrape_realtytrac_page(self, url: str) -> List[Dict[str, Any]]:
        """Scrape a single RealtyTrac page and return property records."""
        self._log(f"Fetching RealtyTrac: {url}")
        resp = self._get(url)
        if not resp or resp.status_code != 200:
            return []

        next_data = self._extract_next_data(resp.text)
        if not next_data:
            self._log("   No __NEXT_DATA__ found on page")
            return []

        page_props = next_data.get("props", {}).get("pageProps", {})
        properties = page_props.get("properties", [])
        total_results = page_props.get("totalResults")

        self._log(f"   Page reports {total_results} total results, {len(properties)} on this page")

        records = []
        for item in properties:
            try:
                record = self._parse_realtytrac_property(item)
                if record:
                    records.append(record)
            except Exception as exc:
                self._log(f"   Parse error for property: {exc}")
                continue

        return records

    def scrape_realtytrac_all(self) -> List[Dict[str, Any]]:
        """Scrape RealtyTrac across multiple listing-type pages and deduplicate."""
        all_records: Dict[str, Dict[str, Any]] = {}

        pages = [
            ("National Foreclosure", f"{REALTYTRAC_BASE}/foreclosure/foreclosures.html"),
            ("Pre-Foreclosure", f"{REALTYTRAC_BASE}/pre-foreclosure/"),
            ("Sold Foreclosures", f"{REALTYTRAC_BASE}/sold/"),
        ]

        for label, url in pages:
            records = self.scrape_realtytrac_page(url)
            added = 0
            for r in records:
                if r["id"] not in all_records:
                    all_records[r["id"]] = r
                    added += 1
            self._log(f"{label}: {len(records)} found, {added} new unique")

        return list(all_records.values())


# ── HUD Home Store Scraper (secondary) ───────────────────────────────────────

class HUDScraper(CountyScraper):
    """Attempt to scrape HUD Home Store (often requires JS)."""

    HUD_SEARCH = "https://www.hudhomestore.gov/Listing/PropertySearchResult"

    def scrape(self) -> List[Dict[str, Any]]:
        """Attempt a simple GET on HUD search page."""
        self._log("Fetching HUD Home Store...")
        resp = self._get(self.HUD_SEARCH)
        if not resp or resp.status_code != 200:
            self._log("   HUD page unavailable or requires JavaScript")
            return []

        # HUD loads listings via JS; without Playwright we can't reliably
        # extract them.  Look for embedded JSON just in case.
        next_data = self._extract_next_data(resp.text)
        if next_data:
            self._log("   Found Next.js data on HUD (unexpected)")
            # Could extend parsing here if HUD ever switches to Next.js

        self._log("   HUD requires JavaScript rendering (Playwright not used here)")
        return []


# ── Orchestrator ─────────────────────────────────────────────────────────────

class ForeclosureScraper:
    """Main orchestrator that combines all sources."""

    def __init__(self, delay: float = 1.5, verbose: bool = False):
        self.delay = delay
        self.verbose = verbose
        self.realtytrac = CountyScraper(delay=delay, verbose=verbose)
        self.hud = HUDScraper(delay=delay, verbose=verbose)

    def scrape(self) -> List[Dict[str, Any]]:
        """Run all scrapers and merge results."""
        all_properties: List[Dict[str, Any]] = []

        print("=" * 60)
        print("County Courthouse Foreclosure Scraper")
        print("=" * 60)
        print()

        # 1. RealtyTrac (primary – real pre-foreclosure / auction / sold data)
        print("[1/2] Scraping RealtyTrac (real county records)...")
        rt_props = self.realtytrac.scrape_realtytrac_all()
        print(f"      -> {len(rt_props)} unique real properties from RealtyTrac")
        all_properties.extend(rt_props)

        # 2. HUD Home Store (secondary – usually JS-rendered)
        print("[2/2] Checking HUD Home Store...")
        hud_props = self.hud.scrape()
        print(f"      -> {len(hud_props)} properties from HUD")
        all_properties.extend(hud_props)

        print()
        print("=" * 60)
        print(f"TOTAL: {len(all_properties)} real foreclosure properties scraped")
        print("=" * 60)

        return all_properties


# ── I/O Helpers ──────────────────────────────────────────────────────────────

def save_json(properties: List[Dict[str, Any]], path: str) -> None:
    """Save properties to JSON file."""
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(properties, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(properties)} records to {out}")


def print_summary(properties: List[Dict[str, Any]]) -> None:
    """Print a human-readable summary."""
    if not properties:
        print("No properties found.")
        return

    states = {}
    for p in properties:
        states[p.get("state", "??")] = states.get(p.get("state", "??"), 0) + 1

    print("\n📊 Summary by State:")
    for st, count in sorted(states.items(), key=lambda x: -x[1]):
        print(f"   {st}: {count} properties")

    prices = [p["price"] for p in properties if p.get("price", 0) > 0]
    if prices:
        print(f"\n💰 Price Stats:")
        print(f"   Min: ${min(prices):,}")
        print(f"   Max: ${max(prices):,}")
        print(f"   Avg: ${sum(prices)//len(prices):,}")

    print(f"\n🏠 Sample Properties:")
    for p in properties[:3]:
        print(f"   • {p['address']}, {p['city']}, {p['state']} {p['zip']}")
        print(f"     Price: ${p['price']:,} | Est. Value: ${p['estimated_value']:,}")
        print(f"     Beds: {p['beds']} | Baths: {p['baths']} | Sqft: {p['sqft']:,}")
        print(f"     Status: {p['status']} | Auction: {p.get('auction_date', 'N/A')}")
        print(f"     Source: {p['source_url']}")
        print()


# ── CLI ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="County Courthouse Foreclosure Scraper")
    parser.add_argument(
        "--output",
        "-o",
        default="foreclosures.json",
        help="Output JSON file path (default: foreclosures.json)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.5,
        help="Seconds between requests (default: 1.5)",
    )
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")
    args = parser.parse_args()

    scraper = ForeclosureScraper(delay=args.delay, verbose=args.verbose)
    properties = scraper.scrape()

    save_json(properties, args.output)
    print_summary(properties)


if __name__ == "__main__":
    main()
