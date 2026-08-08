#!/usr/bin/env python3
"""
Unified Real Data Pipeline for Auction Flipper
Runs all scrapers, normalizes data, clears old fake data, and pushes to Supabase.
"""

import json
import time
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

import requests

# Add scraper directory to path
SCRAPER_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRAPER_DIR))

from fannie_scraper import fetch_properties as fetch_fannie
from freddie_scraper import scrape_homesteps
from gsa_scraper import GSAScraper
from irs_scraper import scrape_treasury_auctions
from county_scraper import ForeclosureScraper
from hud_scraper import scrape_hud_properties

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://weguwjxuvibbyqrrvqcw.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_JauuTENFT1-RfVMhL7FJPQ_VtSxzhGI")

# Schema mapping: app field -> Supabase column
KEY_MAP = {
    "estimatedValue": "estimated_value",
    "lotSize": "lot_size",
    "yearBuilt": "year_built",
    "propertyType": "property_type",
    "auctionDate": "auction_date",
    "auctionType": "auction_type",
    "sourceUrl": "source_url",
    "imageUrl": "image_url",
    "daysOnMarket": "days_on_market",
    "rehabEstimate": "rehab_estimate",
    "caseNumber": "case_number",
    "openingBid": "opening_bid",
    "depositRequired": "deposit_required",
}


def normalize_property(prop: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize any scraper output to the Supabase schema."""
    # Map camelCase keys to snake_case
    row = {}
    for app_key, db_key in KEY_MAP.items():
        if app_key in prop and prop[app_key] is not None:
            row[db_key] = prop[app_key]
    
    # Direct mappings
    for key in ["id", "address", "city", "state", "zip", "price", "beds", "baths", 
                "sqft", "source", "description", "image_url", "status", "notes",
                "latitude", "longitude", "county", "arv", "images"]:
        if key in prop and prop[key] is not None:
            row[key] = prop[key]
    
    # Ensure required fields have defaults
    row.setdefault("price", 0)
    row.setdefault("estimated_value", 0)
    row.setdefault("beds", 0)
    row.setdefault("baths", 0)
    row.setdefault("sqft", 0)
    row.setdefault("status", "Active")
    row.setdefault("source", "Unknown")
    row.setdefault("latitude", 0.0)
    row.setdefault("longitude", 0.0)
    row.setdefault("description", "")
    row.setdefault("image_url", "")
    row.setdefault("days_on_market", 0)
    row.setdefault("rehab_estimate", 0)
    row.setdefault("arv", 0)
    row.setdefault("notes", "")
    row.setdefault("images", [])
    
    # Calculate estimated_value if missing
    if not row.get("estimated_value") and row.get("price"):
        row["estimated_value"] = int(row["price"] * 1.5)
    
    # Calculate ARV if missing
    if not row.get("arv") and row.get("price"):
        row["arv"] = int(row["price"] * 1.8)
    
    # Calculate rehab_estimate if missing
    if not row.get("rehab_estimate") and row.get("price"):
        row["rehab_estimate"] = int(row["price"] * 0.3)
    
    # Ensure arrays
    if "images" not in row or row["images"] is None:
        row["images"] = []
    
    # Label auction_type correctly by source
    src = row.get("source", "")
    if src in ("Fannie Mae HomePath", "Freddie Mac HomeSteps"):
        row["auction_type"] = "REO"
    elif src == "RealtyTrac / County Records":
        row["auction_type"] = "Foreclosure"
    elif src in ("IRS Auctions", "GSA Auctions"):
        row["auction_type"] = "Government"

    # Coerce numeric fields to ints (scrapers may emit floats like 180000.0,
    # and Postgres integer columns reject the string form "180000.0")
    for int_key in ("price", "estimated_value", "arv", "rehab_estimate",
                    "beds", "baths", "sqft", "days_on_market", "year_built",
                    "opening_bid", "deposit_required"):
        v = row.get(int_key)
        if v is not None and v != "":
            try:
                row[int_key] = int(float(v))
            except (ValueError, TypeError):
                row[int_key] = 0
    
    return row


def clear_supabase_properties():
    """Delete ALL existing properties from Supabase (the fake ones)."""
    print("🗑️  Clearing old fake data from Supabase...")
    url = f"{SUPABASE_URL}/rest/v1/properties"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    
    # First, temporarily disable RLS or use service role if available
    # For now, we need to delete everything. Since RLS allows SELECT for everyone
    # but DELETE might be restricted, let's check what we can do.
    # Actually, the RLS policy only allows INSERT for authenticated users.
    # We need to use the service_role key or admin API.
    
    # Try DELETE with the current key
    try:
        resp = requests.delete(url, headers={**headers, "Prefer": "return=minimal"}, timeout=30)
        if resp.status_code in (200, 204):
            print(f"   ✅ Cleared all properties (status {resp.status_code})")
            return True
        else:
            print(f"   ⚠️  DELETE returned {resp.status_code}: {resp.text[:200]}")
            # Try alternative: delete one by one
            return False
    except Exception as e:
        print(f"   ❌ Error clearing: {e}")
        return False


def push_to_supabase(properties: List[Dict[str, Any]], batch_size: int = 50) -> int:
    """Push properties to Supabase via REST API."""
    if not properties:
        print("⚠️  No properties to push")
        return 0
    
    print(f"📡 Pushing {len(properties)} properties to Supabase...")
    url = f"{SUPABASE_URL}/rest/v1/properties"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    
    inserted = 0
    errors = []
    
    for i, prop in enumerate(properties):
        row = normalize_property(prop)
        
        try:
            resp = requests.post(url, headers=headers, json=row, timeout=30)
            if resp.status_code in (200, 201):
                inserted += 1
            else:
                errors.append(f"{row.get('id', 'unknown')}: {resp.status_code} - {resp.text[:150]}")
        except Exception as e:
            errors.append(f"{row.get('id', 'unknown')}: {str(e)}")
        
        if (i + 1) % batch_size == 0:
            print(f"   ... {i+1}/{len(properties)} inserted")
        
        time.sleep(0.1)  # Be polite
    
    print(f"✅ Inserted {inserted}/{len(properties)} properties")
    if errors:
        print(f"⚠️  {len(errors)} errors (showing first 5):")
        for e in errors[:5]:
            print(f"   {e}")
    
    return inserted


def run_hud_scraper() -> List[Dict]:
    """Run HUD Home Store scraper."""
    print("\n" + "=" * 60)
    print("[1/6] HUD Home Store (hudhomestore.gov)")
    print("=" * 60)
    # Scrape key states with active HUD inventory
    states = ["TX", "FL", "CA", "GA", "IL", "MI", "OH", "NC", "AZ", "PA",
              "TN", "MO", "IN", "SC", "AL", "KY", "LA", "OK", "AR", "MS"]
    try:
        props = scrape_hud_properties(states=states, delay=1.0)
        print(f"   -> {len(props)} HUD properties")
        return props
    except Exception as e:
        print(f"   ❌ HUD scraper failed: {e}")
        return []


def run_fannie_scraper() -> List[Dict]:
    """Run Fannie Mae HomePath scraper."""
    print("\n" + "=" * 60)
    print("[2/6] Fannie Mae HomePath (homepath.fanniemae.com)")
    print("=" * 60)
    try:
        props = fetch_fannie(limit=400, max_pages=1, delay_seconds=1.0)
        # Add required fields that might be missing
        for p in props:
            p.setdefault("lotSize", None)
            p.setdefault("yearBuilt", None)
            p.setdefault("daysOnMarket", 0)
            p.setdefault("rehabEstimate", 0)
            p.setdefault("arv", 0)
            p.setdefault("notes", "")
            p.setdefault("county", "")
            p.setdefault("caseNumber", None)
            p.setdefault("openingBid", None)
            p.setdefault("depositRequired", None)
            p.setdefault("images", [])
        print(f"   -> {len(props)} Fannie Mae properties")
        return props
    except Exception as e:
        print(f"   ❌ Fannie Mae scraper failed: {e}")
        return []


def run_freddie_scraper() -> List[Dict]:
    """Run Freddie Mac HomeSteps scraper."""
    print("\n" + "=" * 60)
    print("[3/6] Freddie Mac HomeSteps (homesteps.com)")
    print("=" * 60)
    try:
        # Search key states
        queries = ["FL", "TX", "CA", "GA", "IL", "NC", "AZ", "OH", "MI", "MO"]
        props = scrape_homesteps(search_queries=queries, delay=1.0)
        # Fill missing fields
        for p in props:
            p.setdefault("estimatedValue", p.get("price", 0))
            p.setdefault("lotSize", None)
            p.setdefault("yearBuilt", None)
            p.setdefault("daysOnMarket", 0)
            p.setdefault("rehabEstimate", 0)
            p.setdefault("arv", 0)
            p.setdefault("notes", "")
            p.setdefault("county", "")
            p.setdefault("caseNumber", None)
            p.setdefault("openingBid", None)
            p.setdefault("depositRequired", None)
            p.setdefault("images", [])
        print(f"   -> {len(props)} Freddie Mac properties")
        return props
    except Exception as e:
        print(f"   ❌ Freddie Mac scraper failed: {e}")
        return []


def run_gsa_scraper() -> List[Dict]:
    """Run GSA Auctions scraper."""
    print("\n" + "=" * 60)
    print("[4/6] GSA Auctions (gsaauctions.gov)")
    print("=" * 60)
    try:
        scraper = GSAScraper(delay=1.0)
        props = scraper.scrape(limit=200, real_estate_only=True)
        # Convert dataclass to dict
        result = []
        for p in props:
            d = p.to_dict() if hasattr(p, 'to_dict') else p.__dict__
            # Remove internal fields
            d.pop("raw_data", None)
            # Map to app schema
            mapped = {
                "id": d.get("id"),
                "address": d.get("address"),
                "city": d.get("city"),
                "state": d.get("state"),
                "zip": d.get("zip"),
                "price": d.get("price", 0),
                "estimatedValue": d.get("estimated_value", 0),
                "beds": d.get("beds", 0),
                "baths": d.get("baths", 0),
                "sqft": d.get("sqft", 0),
                "lotSize": d.get("lot_size"),
                "propertyType": d.get("property_type", "Unknown"),
                "auctionDate": d.get("auction_date"),
                "auctionType": d.get("auction_type", "Government"),
                "source": d.get("source"),
                "sourceUrl": d.get("source_url"),
                "description": d.get("description"),
                "imageUrl": d.get("image_url", ""),
                "status": d.get("status", "Active"),
                "latitude": d.get("latitude", 0.0),
                "longitude": d.get("longitude", 0.0),
                "notes": d.get("notes", ""),
                "daysOnMarket": 0,
                "rehabEstimate": 0,
                "arv": 0,
                "images": [],
                "county": "",
                "caseNumber": None,
                "openingBid": None,
                "depositRequired": None,
            }
            result.append(mapped)
        print(f"   -> {len(result)} GSA properties")
        return result
    except Exception as e:
        print(f"   ❌ GSA scraper failed: {e}")
        return []


def run_irs_scraper() -> List[Dict]:
    """Run Treasury/IRS scraper."""
    print("\n" + "=" * 60)
    print("[5/6] Treasury/IRS Auctions (treasury.gov)")
    print("=" * 60)
    try:
        props = scrape_treasury_auctions(include_geocode=False)
        # Fill missing fields
        for p in props:
            p.setdefault("estimatedValue", p.get("price", 0))
            p.setdefault("lotSize", None)
            p.setdefault("yearBuilt", None)
            p.setdefault("daysOnMarket", 0)
            p.setdefault("rehabEstimate", 0)
            p.setdefault("arv", 0)
            p.setdefault("notes", "")
            p.setdefault("county", "")
            p.setdefault("caseNumber", None)
            p.setdefault("openingBid", None)
            p.setdefault("depositRequired", None)
            p.setdefault("images", [])
            p.setdefault("imageUrl", "")
        print(f"   -> {len(props)} IRS properties")
        return props
    except Exception as e:
        print(f"   ❌ IRS scraper failed: {e}")
        return []


def run_county_scraper() -> List[Dict]:
    """Run County/RealtyTrac scraper."""
    print("\n" + "=" * 60)
    print("[6/6] County Records / RealtyTrac (realtytrac.com)")
    print("=" * 60)
    try:
        scraper = ForeclosureScraper(delay=1.5, verbose=False)
        props = scraper.scrape()
        # Fill missing fields
        for p in props:
            p.setdefault("estimatedValue", p.get("estimated_value", 0))
            p.setdefault("lotSize", p.get("lot_size"))
            p.setdefault("yearBuilt", p.get("year_built"))
            p.setdefault("daysOnMarket", 0)
            p.setdefault("rehabEstimate", 0)
            p.setdefault("arv", 0)
            p.setdefault("notes", "")
            p.setdefault("caseNumber", None)
            p.setdefault("openingBid", None)
            p.setdefault("depositRequired", None)
            p.setdefault("images", [])
        print(f"   -> {len(props)} County/RealtyTrac properties")
        return props
    except Exception as e:
        print(f"   ❌ County scraper failed: {e}")
        return []


def main():
    print("=" * 70)
    print("🏠 AUCTION FLIPPER - REAL DATA PIPELINE")
    print("   Fetching live properties from 6 free government sources")
    print("=" * 70)
    print()
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    all_properties = []
    
    # Run all scrapers
    all_properties.extend(run_hud_scraper())
    all_properties.extend(run_fannie_scraper())
    all_properties.extend(run_freddie_scraper())
    all_properties.extend(run_gsa_scraper())
    all_properties.extend(run_irs_scraper())
    all_properties.extend(run_county_scraper())
    
    print("\n" + "=" * 70)
    print("📊 SCRAPING COMPLETE")
    print("=" * 70)
    print(f"Total real properties scraped: {len(all_properties)}")
    
    if not all_properties:
        print("❌ No properties found from any source. Aborting.")
        return
    
    # Summary by source
    by_source = {}
    by_state = {}
    for p in all_properties:
        src = p.get("source", "Unknown")
        by_source[src] = by_source.get(src, 0) + 1
        st = p.get("state", "??")
        by_state[st] = by_state.get(st, 0) + 1
    
    print("\nBy Source:")
    for src, count in sorted(by_source.items(), key=lambda x: -x[1]):
        print(f"   {src}: {count}")
    
    print("\nTop 10 States:")
    for st, count in sorted(by_state.items(), key=lambda x: -x[1])[:10]:
        print(f"   {st}: {count}")
    
    # Save to JSON backup
    backup_path = SCRAPER_DIR / "real_properties_backup.json"
    with open(backup_path, "w") as f:
        json.dump(all_properties, f, indent=2)
    print(f"\n💾 Saved backup to {backup_path}")
    
    # Clear old data and push to Supabase
    print("\n" + "=" * 70)
    print("🗄️  UPDATING SUPABASE DATABASE")
    print("=" * 70)
    
    cleared = clear_supabase_properties()
    if not cleared:
        print("   ⚠️  Could not clear via DELETE. Will try to upsert instead.")
    
    inserted = push_to_supabase(all_properties)
    
    print("\n" + "=" * 70)
    print("✅ DONE!")
    print("=" * 70)
    print(f"Real properties in database: {inserted}")
    print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
