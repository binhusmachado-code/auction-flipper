#!/usr/bin/env python3
"""
Freddie Mac HomeSteps Scraper
Fetches REO property listings from homesteps.com

Strategy:
1. Search by state abbreviation (or custom query) on /listing/search
2. Parse HTML for listing URLs, prices, status
3. Visit each listing detail page and extract JSON-LD structured data
4. Map to standard property format
"""

import json
import re
import time
from typing import List, Dict, Optional
from urllib.parse import urljoin, urlparse

try:
    import requests
except ImportError:
    raise ImportError("requests library required. Install: pip install requests")

BASE_URL = "https://www.homesteps.com"
SEARCH_URL = f"{BASE_URL}/listing/search"
LISTING_PER_PAGE = 25

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/avif,image/webp,*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
}


class FreddieScraperError(Exception):
    pass


def _parse_search_results(html: str) -> tuple:
    """
    Parse search result HTML.
    Returns (total_properties, list_of_listing_dicts)
    Each listing dict has: url, node_id, price, status
    """
    listings = []

    # Extract total properties count
    total_match = re.search(r'data-totalproperties="(\d+)"', html)
    total_properties = int(total_match.group(1)) if total_match else 0

    # Find all listing cards
    # Pattern: <a id="node-XXXXX" class="no-decoration" href="/listingdetails/...">
    card_pattern = re.compile(
        r'<a\s+id="(node-\d+)"\s+class="no-decoration"\s+href="(/listingdetails/[^"]+)"',
        re.IGNORECASE,
    )

    seen_urls = set()
    for match in card_pattern.finditer(html):
        node_id = match.group(1)
        relative_url = match.group(2)
        listing_url = urljoin(BASE_URL, relative_url)
        # Skip duplicates within the same page (some appear twice in HTML)
        if listing_url in seen_urls:
            continue
        seen_urls.add(listing_url)
        listings.append({
            "node_id": node_id,
            "url": listing_url,
            "price": None,
            "status": None,
        })

    # Try to extract prices and statuses for each listing
    # Price: <div class="property-price weight-medium">$179,900</div>
    # Status: <div class="property-status-value">Active</div>
    price_pattern = re.compile(
        r'<div\s+class="[^"]*property-price[^"]*">\s*\$?([0-9,]+)\s*</div>',
        re.IGNORECASE,
    )
    status_pattern = re.compile(
        r'<div\s+class="[^"]*property-status-value[^"]*">\s*([^<]+)\s*</div>',
        re.IGNORECASE,
    )

    prices = price_pattern.findall(html)
    statuses = status_pattern.findall(html)

    for i, listing in enumerate(listings):
        if i < len(prices):
            listing["price"] = prices[i].replace(",", "")
        if i < len(statuses):
            listing["status"] = statuses[i].strip()

    return total_properties, listings


def _extract_json_ld(html: str) -> Optional[Dict]:
    """Extract RealEstateListing JSON-LD from listing detail HTML."""
    # Find all application/ld+json scripts
    ld_pattern = re.compile(
        r'<script\s+type="application/ld\+json">(.*?)</script>',
        re.DOTALL | re.IGNORECASE,
    )

    for match in ld_pattern.finditer(html):
        try:
            data = json.loads(match.group(1).strip())
            if isinstance(data, dict):
                # Could be @graph array or direct object
                if "@graph" in data:
                    for item in data["@graph"]:
                        if isinstance(item, dict) and item.get("@type") == ["RealEstateListing"]:
                            return item
                elif data.get("@type") == ["RealEstateListing"]:
                    return data
        except (json.JSONDecodeError, TypeError):
            continue
    return None


def _parse_listing_detail(html: str, listing_url: str) -> Optional[Dict]:
    """
    Parse a listing detail page and return structured property data.
    Returns None if JSON-LD not found.
    """
    ld = _extract_json_ld(html)
    if not ld:
        return None

    # Extract address
    location = ld.get("@location", {}) or {}
    address = location.get("address", {}) or {}
    geo = location.get("geo", {}) or {}

    street = address.get("streetAddress", "")
    city = address.get("addressLocality", "")
    state = address.get("addressRegion", "")
    zip_code = address.get("postalCode", "")

    # Extract price
    offers = ld.get("offers", {}) or {}
    price_str = offers.get("price", "")
    price = None
    if price_str:
        price_clean = price_str.replace("$", "").replace(",", "").strip()
        try:
            price = int(price_clean)
        except ValueError:
            price = None

    # Extract property features from itemOffered
    item = offers.get("itemOffered", {}) or {}

    beds = item.get("numberOfBedrooms", "")
    baths = item.get("numberOfBathroomsTotal", "")

    sqft = None
    floor_size = item.get("floorSize", {}) or {}
    if floor_size and "value" in floor_size:
        sqft_str = str(floor_size["value"]).replace(",", "").strip()
        try:
            sqft = int(sqft_str)
        except ValueError:
            sqft = None

    property_type = item.get("accommodationCategory", "Single Family")
    year_built = item.get("yearBuilt", "")

    # Images
    images = ld.get("image", []) or []
    image_url = None
    if images and isinstance(images, list) and len(images) > 0:
        first_img = images[0]
        if isinstance(first_img, dict):
            image_url = first_img.get("url", "")
        elif isinstance(first_img, str):
            image_url = first_img

    # Description
    description = ld.get("description", "")
    name = ld.get("name", "")

    # Status from additionalProperty
    status = "Active"
    additional = item.get("additionalProperty", []) or []
    for prop in additional:
        if isinstance(prop, dict) and prop.get("name") == "Status":
            status = prop.get("value", "Active")
            break

    # Latitude / Longitude
    lat = None
    lng = None
    if geo:
        try:
            lat = float(geo.get("latitude", 0))
            lng = float(geo.get("longitude", 0))
        except (ValueError, TypeError):
            pass

    # Generate unique ID from URL slug
    slug = urlparse(listing_url).path.strip("/").split("/")[-1]
    unique_id = slug.replace("listingdetails/", "").replace("-", "_")

    return {
        "id": f"freddie-{unique_id}",
        "address": street,
        "city": city,
        "state": state,
        "zip": zip_code,
        "price": price,
        "estimated_value": None,
        "beds": int(beds) if beds and str(beds).isdigit() else None,
        "baths": float(baths) if baths else None,
        "sqft": sqft,
        "property_type": property_type,
        "auction_date": None,
        "auction_type": "REO",
        "source": "Freddie Mac HomeSteps",
        "source_url": listing_url,
        "description": description or name,
        "image_url": image_url,
        "status": status,
        "latitude": lat,
        "longitude": lng,
    }


def search_listings(query: str = "FL", session: Optional[requests.Session] = None, delay: float = 1.0) -> List[Dict]:
    """
    Search HomeSteps for listings matching the query.
    Returns list of listing summary dicts with url, price, status.
    """
    if session is None:
        session = requests.Session()
        session.headers.update(HEADERS)

    all_listings = []
    page = 0

    while True:
        params = {"search": query}
        if page > 0:
            params["page"] = page

        try:
            resp = session.get(SEARCH_URL, params=params, timeout=30)
            resp.raise_for_status()
        except requests.RequestException as e:
            raise FreddieScraperError(f"Search request failed for page {page}: {e}")

        total, listings = _parse_search_results(resp.text)

        if not listings:
            break

        all_listings.extend(listings)

        # Check if we've reached the end
        if len(all_listings) >= total:
            break

        page += 1
        time.sleep(delay)

    return all_listings


def fetch_listing_detail(listing_url: str, session: Optional[requests.Session] = None, delay: float = 1.0) -> Optional[Dict]:
    """Fetch and parse a single listing detail page."""
    if session is None:
        session = requests.Session()
        session.headers.update(HEADERS)

    try:
        resp = session.get(listing_url, timeout=30)
        resp.raise_for_status()
    except requests.RequestException as e:
        print(f"Warning: Failed to fetch {listing_url}: {e}")
        return None

    return _parse_listing_detail(resp.text, listing_url)


def scrape_homesteps(search_queries: Optional[List[str]] = None, delay: float = 1.0) -> List[Dict]:
    """
    Main scraper function.
    Searches HomeSteps for listings and returns full property data.

    Args:
        search_queries: List of search terms (state abbreviations work well).
                       Defaults to a curated list of states with active listings.
        delay: Seconds to wait between requests (be polite).

    Returns:
        List of property dicts in the standard format.
    """
    if search_queries is None:
        # Default to states known to have active listings
        search_queries = ["FL", "TX", "CA", "GA", "IL", "NC", "AZ", "OH", "MI", "MO"]

    session = requests.Session()
    session.headers.update(HEADERS)

    all_results = []
    seen_urls = set()

    for query in search_queries:
        print(f"[HomeSteps] Searching: '{query}' ...")
        try:
            listings = search_listings(query, session=session, delay=delay)
        except FreddieScraperError as e:
            print(f"[HomeSteps] Search error for '{query}': {e}")
            continue

        if not listings:
            print(f"[HomeSteps] No results for '{query}'")
            continue

        print(f"[HomeSteps] Found {len(listings)} listings for '{query}'")

        for listing in listings:
            url = listing["url"]
            if url in seen_urls:
                continue
            seen_urls.add(url)

            detail = fetch_listing_detail(url, session=session, delay=delay)
            if detail:
                # Merge search-level price/status if detail is missing them
                if detail.get("price") is None and listing.get("price"):
                    try:
                        detail["price"] = int(listing["price"])
                    except ValueError:
                        pass
                if detail.get("status") is None and listing.get("status"):
                    detail["status"] = listing["status"]
                all_results.append(detail)
            else:
                # Fallback: create minimal record from search data
                slug = urlparse(url).path.strip("/").split("/")[-1]
                unique_id = slug.replace("listingdetails/", "").replace("-", "_")
                all_results.append({
                    "id": f"freddie-{unique_id}",
                    "address": None,
                    "city": None,
                    "state": None,
                    "zip": None,
                    "price": int(listing["price"]) if listing.get("price") else None,
                    "estimated_value": None,
                    "beds": None,
                    "baths": None,
                    "sqft": None,
                    "property_type": "Single Family",
                    "auction_date": None,
                    "auction_type": "REO",
                    "source": "Freddie Mac HomeSteps",
                    "source_url": url,
                    "description": "",
                    "image_url": None,
                    "status": listing.get("status", "Unknown"),
                    "latitude": None,
                    "longitude": None,
                })

        time.sleep(delay)

    print(f"[HomeSteps] Total unique properties scraped: {len(all_results)}")
    return all_results


def main():
    """CLI entry point for testing."""
    import argparse

    parser = argparse.ArgumentParser(description="Scrape Freddie Mac HomeSteps listings")
    parser.add_argument("--search", default="FL", help="Search query (state abbrev works best)")
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between requests in seconds")
    parser.add_argument("--output", default="homesteps_listings.json", help="Output JSON file")
    args = parser.parse_args()

    results = scrape_homesteps(search_queries=[args.search], delay=args.delay)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(results)} properties to {args.output}")

    # Print a sample
    if results:
        print("\n--- Sample Property ---")
        print(json.dumps(results[0], indent=2))


if __name__ == "__main__":
    main()
