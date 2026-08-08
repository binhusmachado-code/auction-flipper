#!/usr/bin/env python3
"""
HUD Home Store Scraper
Fetches FHA foreclosure REO property listings from hudhomestore.gov
"""

import json
import html
import re
import time
from datetime import datetime
from typing import List, Dict, Optional
import urllib.request
import urllib.error


# All US states
US_STATES = [
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    "DC", "PR", "VI", "GU", "AS", "MP"
]

BASE_URL = "https://www.hudhomestore.gov"
SEARCH_URL = f"{BASE_URL}/searchresult"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def fetch_state_properties(state: str, max_retries: int = 3) -> List[Dict]:
    """Fetch properties for a single state from HUD Home Store."""
    url = f"{SEARCH_URL}?citystate={state}"
    
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as response:
                page_html = response.read().decode("utf-8")
            
            # Extract available_prop hidden input (HTML-encoded JSON)
            match = re.search(
                r'id=["\']available_prop["\'][^>]*value=["\']([^"\']*)["\']',
                page_html
            )
            
            if not match:
                print(f"  [{state}] No available_prop found in response")
                return []
            
            raw_value = match.group(1)
            if not raw_value or raw_value == "null":
                return []
            
            # Decode HTML entities and parse JSON
            decoded = html.unescape(raw_value)
            properties = json.loads(decoded)
            
            if not isinstance(properties, list):
                print(f"  [{state}] Unexpected data type: {type(properties)}")
                return []
            
            return properties
            
        except urllib.error.HTTPError as e:
            if e.code == 404:
                print(f"  [{state}] State not found (404)")
                return []
            print(f"  [{state}] HTTP {e.code} (attempt {attempt + 1}/{max_retries})")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
        except urllib.error.URLError as e:
            print(f"  [{state}] Network error: {e.reason} (attempt {attempt + 1}/{max_retries})")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)
        except json.JSONDecodeError as e:
            print(f"  [{state}] JSON parse error: {e}")
            return []
        except Exception as e:
            print(f"  [{state}] Unexpected error: {type(e).__name__}: {e}")
            return []
    
    return []


def normalize_property_type(prop_type: Optional[str]) -> str:
    """Normalize property type to standard format."""
    if not prop_type:
        return "Unknown"
    
    prop_type_lower = prop_type.lower()
    if "single family" in prop_type_lower:
        return "Single Family"
    elif "condo" in prop_type_lower:
        return "Condo"
    elif "townhouse" in prop_type_lower or "town home" in prop_type_lower:
        return "Townhouse"
    elif "multi" in prop_type_lower or "duplex" in prop_type_lower or "triplex" in prop_type_lower:
        return "Multi-Family"
    elif "mobile" in prop_type_lower:
        return "Mobile Home"
    elif "commercial" in prop_type_lower:
        return "Commercial"
    else:
        return prop_type


def parse_date(date_str: Optional[str]) -> Optional[str]:
    """Parse MM/DD/YYYY format to YYYY-MM-DD."""
    if not date_str:
        return None
    try:
        dt = datetime.strptime(date_str, "%m/%d/%Y")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return None


def safe_float(value, default=0.0):
    """Safely convert to float."""
    if value is None:
        return default
    try:
        return float(str(value).replace(",", "").replace("$", ""))
    except (ValueError, TypeError):
        return default


def safe_int(value, default=0):
    """Safely convert to int."""
    if value is None:
        return default
    try:
        return int(float(str(value).replace(",", "")))
    except (ValueError, TypeError):
        return default


def map_property(raw: Dict) -> Dict:
    """Map raw HUD property data to standardized format."""
    case_number = raw.get("propertyCaseNumber", "")
    
    # Use bidOpenDate as auction_date if available, otherwise periodDeadlineDate
    auction_date = parse_date(raw.get("bidOpenDate")) or parse_date(raw.get("periodDeadlineDate"))
    
    # Price handling
    list_price = safe_float(raw.get("listPrice"))
    
    # Image URL
    thumb = raw.get("propertyThumb", "")
    # If thumbnail is empty, try to construct from galleryImages
    if not thumb and raw.get("galleryImages"):
        gallery = raw.get("galleryImages", "")
        if gallery and gallery != '""':
            # Parse the gallery image list
            images = [img.strip().strip('"') for img in gallery.split(",") if img.strip().strip('"')]
            if images:
                thumb = f"https://res.cloudinary.com/yardi/image/upload/q_auto,f_auto,c_limit/d_hhs:themes:common:images:NoImage.jpg/hhs/{images[0]}"
    
    # Bedrooms - sometimes "5", sometimes null
    beds = safe_int(raw.get("bedrooms"))
    
    # Bathrooms - can be "3.1" (string) or 3.1 (float)
    baths = safe_float(raw.get("bathrooms"))
    
    # Square footage
    sqft = safe_int(raw.get("squareFootage"))
    
    # Build description
    description_parts = []
    if raw.get("fhaFinancing"):
        description_parts.append(f"FHA Financing: {raw['fhaFinancing']}")
    if raw.get("listingPeriod"):
        description_parts.append(f"Listing Period: {raw['listingPeriod']}")
    if raw.get("eligibleBidders"):
        description_parts.append(f"Eligible Bidders: {raw['eligibleBidders']}")
    if raw.get("propertyStatusDesc"):
        description_parts.append(f"Status: {raw['propertyStatusDesc']}")
    if raw.get("yearBuilt"):
        description_parts.append(f"Year Built: {raw['yearBuilt']}")
    if raw.get("propertyAge"):
        description_parts.append(f"Property Age: {raw['propertyAge']} years")
    
    description = "; ".join(description_parts) if description_parts else "HUD REO Property"
    
    return {
        "id": f"hud-{case_number}",
        "address": raw.get("propertyAddress", ""),
        "city": raw.get("propertyCity", ""),
        "state": raw.get("propertyState", ""),
        "zip": raw.get("propertyZip", ""),
        "price": int(list_price),
        "estimated_value": int(list_price),  # HUD doesn't provide estimated value; use list price
        "beds": beds,
        "baths": baths,
        "sqft": sqft,
        "property_type": normalize_property_type(raw.get("propertyType")),
        "auction_date": auction_date,
        "auction_type": "REO",
        "source": "HUD Home Store",
        "source_url": f"{BASE_URL}/propertydetails?caseNumber={case_number}",
        "description": description,
        "image_url": thumb,
        "status": raw.get("propertyStatusDesc") or raw.get("propertyStatus", "Active"),
        "latitude": safe_float(raw.get("latitude")),
        "longitude": safe_float(raw.get("longitude")),
    }


def scrape_hud_properties(states: Optional[List[str]] = None, delay: float = 1.0) -> List[Dict]:
    """
    Scrape HUD Home Store properties.
    
    Args:
        states: List of state codes to search. Defaults to all US states.
        delay: Seconds to wait between state requests.
    
    Returns:
        List of standardized property dictionaries.
    """
    if states is None:
        states = US_STATES
    
    all_properties = []
    total_raw = 0
    
    print(f"Scraping HUD Home Store for {len(states)} states...")
    print(f"Endpoint: {SEARCH_URL}?citystate={{STATE}}")
    print()
    
    for i, state in enumerate(states):
        print(f"[{i+1}/{len(states)}] Fetching {state}...")
        
        raw_properties = fetch_state_properties(state)
        total_raw += len(raw_properties)
        
        if raw_properties:
            mapped = [map_property(p) for p in raw_properties]
            all_properties.extend(mapped)
            print(f"  -> Found {len(mapped)} properties")
        else:
            print(f"  -> No properties found")
        
        # Rate limiting - be nice to the server
        if i < len(states) - 1:
            time.sleep(delay)
    
    print()
    print(f"=== Results ===")
    print(f"States searched: {len(states)}")
    print(f"Total raw properties: {total_raw}")
    print(f"Total mapped properties: {len(all_properties)}")
    
    return all_properties


def main():
    """Main entry point - test with a few states."""
    # Test with a subset of states first
    test_states = ["TX", "FL", "CA", "NY", "IL"]
    
    print("=" * 60)
    print("HUD HOME STORE SCRAPER - TEST RUN")
    print("=" * 60)
    print()
    
    properties = scrape_hud_properties(states=test_states, delay=1.5)
    
    if properties:
        print()
        print("=== Sample Properties ===")
        for p in properties[:3]:
            print()
            print(json.dumps(p, indent=2))
        
        print()
        print(f"=== Summary ===")
        print(f"Total properties found: {len(properties)}")
        
        # Count by state
        state_counts = {}
        for p in properties:
            state_counts[p['state']] = state_counts.get(p['state'], 0) + 1
        print("Properties by state:")
        for state, count in sorted(state_counts.items()):
            print(f"  {state}: {count}")
    else:
        print("No properties found.")
    
    return properties


if __name__ == "__main__":
    properties = main()
