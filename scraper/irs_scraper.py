#!/usr/bin/env python3
"""
Treasury/IRS Seized Real Property Auction Scraper

Scrapes real property listings from:
- https://www.treasury.gov/auctions/treasury/rp/realprop.shtml (upcoming auctions list)
- Individual property pages for detailed info

Output format matches the Property Action app schema.
"""

import re
import json
import logging
import hashlib
import html as html_mod
from datetime import datetime
from urllib.parse import urljoin
from typing import Optional

try:
    import requests
except ImportError:
    raise ImportError("requests is required. Install with: pip install requests")

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://www.treasury.gov/auctions/treasury/rp/"
LISTING_URL = urljoin(BASE_URL, "realprop.shtml")


def fetch_html(url: str, timeout: int = 30) -> Optional[str]:
    """Fetch HTML from a URL with error handling."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
    }
    try:
        resp = requests.get(url, headers=headers, timeout=timeout)
        resp.raise_for_status()
        text = resp.text
        if "\ufffd" in text:
            text = resp.content.decode("iso-8859-1", errors="replace")
        return text
    except requests.RequestException as e:
        logger.error("Failed to fetch %s: %s", url, e)
        return None


def parse_money(text: str) -> Optional[int]:
    """Extract integer dollar amount from strings like '$435,000'."""
    if not text:
        return None
    m = re.search(r"\$([0-9,]+)", text)
    if m:
        try:
            return int(m.group(1).replace(",", ""))
        except ValueError:
            pass
    m = re.search(r"([0-9,]+)", text)
    if m:
        try:
            return int(m.group(1).replace(",", ""))
        except ValueError:
            pass
    return None


def parse_address(raw: str) -> dict:
    """Parse a U.S. address string into components."""
    raw = re.sub(r"^LOT\s+\d+:\s*", "", raw, flags=re.IGNORECASE).strip()
    result = {"address": raw, "city": "", "state": "", "zip": ""}

    match = re.search(r",\s*([^,]+?),\s*([A-Za-z\s]+?)\s+(\d{5}(?:-\d{4})?)\s*$", raw)
    if match:
        result["city"] = match.group(1).strip()
        result["state"] = state_name_to_abbr(match.group(2).strip())
        result["zip"] = match.group(3).strip()
        result["address"] = raw[:match.start()].strip().rstrip(",")
    else:
        match2 = re.search(r",\s*([A-Za-z\s]+?)\s+(\d{5}(?:-\d{4})?)\s*$", raw)
        if match2:
            result["state"] = state_name_to_abbr(match2.group(1).strip())
            result["zip"] = match2.group(2).strip()
            before = raw[:match2.start()].strip().rstrip(",")
            cm = re.search(r",\s*([^,]+)$", before)
            if cm:
                result["city"] = cm.group(1).strip()
                result["address"] = before[:cm.start()].strip().rstrip(",")
            else:
                result["address"] = before
    return result


STATE_ABBR = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR",
    "california": "CA", "colorado": "CO", "connecticut": "CT", "delaware": "DE",
    "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
    "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS",
    "kentucky": "KY", "louisiana": "LA", "maine": "ME", "maryland": "MD",
    "massachusetts": "MA", "michigan": "MI", "minnesota": "MN", "mississippi": "MS",
    "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
    "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
    "north carolina": "NC", "north dakota": "ND", "ohio": "OH", "oklahoma": "OK",
    "oregon": "OR", "pennsylvania": "PA", "rhode island": "RI", "south carolina": "SC",
    "south dakota": "SD", "tennessee": "TN", "texas": "TX", "utah": "UT",
    "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
    "wisconsin": "WI", "wyoming": "WY", "puerto rico": "PR",
}


def state_name_to_abbr(name: str) -> str:
    key = name.lower().strip()
    return STATE_ABBR.get(key, key.upper()[:2] if len(key) <= 2 else key)


_WORD_TO_NUM = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
}


def _word_or_digit_to_int(text: str) -> Optional[int]:
    text = text.strip().lower()
    if text in _WORD_TO_NUM:
        return _WORD_TO_NUM[text]
    try:
        return int(text)
    except ValueError:
        return None


def parse_sqft_beds_baths_from_desc(desc: str) -> dict:
    """Extract beds, baths, and sqft from property description text."""
    result = {"sqft": None, "beds": None, "baths": None}
    if not desc:
        return result

    sqft_match = re.search(r"([0-9,]+)\s*[\u00b1+-]?\s*sq\.?\s*ft", desc, re.IGNORECASE)
    if sqft_match:
        try:
            result["sqft"] = int(sqft_match.group(1).replace(",", ""))
        except ValueError:
            pass

    bed_match = re.search(r"(\w+)\s*[\u00b1+-]?\s*bedroom", desc, re.IGNORECASE)
    if bed_match:
        result["beds"] = _word_or_digit_to_int(bed_match.group(1))

    full_baths = re.findall(r"(\w+)\s*[\u00b1+-]?\s*full\s+bath", desc, re.IGNORECASE)
    half_baths = re.findall(r"(\w+)\s*[\u00b1+-]?\s*half\s+bath", desc, re.IGNORECASE)

    total = 0.0
    has_data = False
    for m in full_baths:
        val = _word_or_digit_to_int(m)
        if val is not None:
            total += float(val)
            has_data = True
    for m in half_baths:
        val = _word_or_digit_to_int(m)
        if val is not None:
            total += val * 0.5
            has_data = True

    if not has_data:
        bm = re.search(r"(\d+(?:\.\d+)?)\s*[\u00b1+-]?\s*bath", desc, re.IGNORECASE)
        if bm:
            try:
                total = float(bm.group(1))
                has_data = True
            except ValueError:
                pass

    if has_data:
        result["baths"] = total

    return result


def parse_auction_date(text: str) -> Optional[str]:
    if not text:
        return None
    m = re.search(r"([A-Za-z]+,\s+[A-Za-z]+\s+\d{1,2},?\s+\d{4})", text)
    if not m:
        m = re.search(r"([A-Za-z]+\s+\d{1,2},?\s+\d{4})", text)
    if not m:
        return None
    date_str = m.group(1).replace(",", "").strip()
    for fmt in ("%A %B %d %Y", "%B %d %Y", "%A %B %d, %Y", "%B %d, %Y"):
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def normalize_property_type(prop_type: str) -> str:
    pt = prop_type.lower()
    if "single family" in pt or "single-family" in pt:
        return "Single Family"
    if "condo" in pt:
        return "Condo"
    if "townhouse" in pt or "townhome" in pt:
        return "Townhouse"
    if "duplex" in pt:
        return "Duplex"
    if "commercial" in pt:
        return "Commercial"
    if "land" in pt or "vacant" in pt or "lot" in pt:
        return "Land"
    if "estate" in pt:
        return "Estate"
    if "apartment" in pt:
        return "Apartment"
    if "manufactured" in pt or "mobile" in pt:
        return "Manufactured Home"
    if "office" in pt:
        return "Office"
    return prop_type.title() if prop_type else "Other"


def scrape_listing_page() -> list[dict]:
    logger.info("Fetching listing page: %s", LISTING_URL)
    html = fetch_html(LISTING_URL)
    if not html:
        return []

    properties = []
    rows = re.split(r'<tr[^>]*>', html, flags=re.IGNORECASE)

    seen_pages = set()
    for row in rows:
        link_match = re.search(r'<a\s+href="([^"]+\.shtml)"', row, re.IGNORECASE)
        if not link_match:
            continue
        href = link_match.group(1)
        if href in seen_pages or href in ("112bruni.shtml",):
            continue
        seen_pages.add(href)

        if not re.search(r'[A-Za-z]+\s+\d{5}', row):
            continue

        prop = {"detail_url": urljoin(BASE_URL, href), "detail_page": href}

        type_match = re.search(
            r'<font\s+color="#[cC][cC]0000"[^>]*>\s*<b>([^<]+)</b>',
            row, re.IGNORECASE,
        )
        prop["raw_type"] = type_match.group(1).strip() if type_match else ""

        addr_match = re.search(
            r'<span\s+class="style12"[^>]*>.*?<font\s+color="#[cC][cC]0000"[^>]*>(.*?)</font>',
            row, re.DOTALL | re.IGNORECASE,
        )
        if addr_match:
            raw_addr = re.sub(r"<[^>]+>", "", addr_match.group(1)).strip()
            raw_addr = re.sub(r"^[A-Z\s]+:\s*", "", raw_addr)
            prop["address_raw"] = raw_addr
        else:
            all_red = re.findall(
                r'<font\s+color="#[cC][cC]0000"[^>]*>(.*?)</font>',
                row, re.DOTALL | re.IGNORECASE,
            )
            if len(all_red) > 1:
                raw_addr = re.sub(r"<[^>]+>", "", all_red[1]).strip()
                raw_addr = re.sub(r"^[A-Z\s]+:\s*", "", raw_addr)
                prop["address_raw"] = raw_addr
            else:
                prop["address_raw"] = ""

        date_match = re.search(
            r'ONLINE\s+AUCTION\s+DATE[^:]*:\s*([^<\n]+)', row, re.IGNORECASE,
        )
        prop["auction_date_raw"] = re.sub(r"<[^>]+>", "", date_match.group(1)).strip() if date_match else ""

        desc_match = re.search(
            r'<span\s+class="style11"[^>]*>.*?<font[^>]*>(.*?)</font>.*?</span>',
            row, re.DOTALL | re.IGNORECASE,
        )
        prop["description"] = re.sub(r"<[^>]+>", "", desc_match.group(1)).strip() if desc_match else ""

        sale_match = re.search(r"Sale\s+#\s*([\d\-]+)", row, re.IGNORECASE)
        prop["sale_number"] = sale_match.group(1).strip() if sale_match else ""

        properties.append(prop)

    logger.info("Found %d properties on listing page", len(properties))
    return properties


def _extract_value_after_label(html: str, label: str) -> Optional[str]:
    """Extract value after a bold label by converting table cells to text lines."""
    text = re.sub(r'</td>', '\n', html, flags=re.IGNORECASE)
    text = re.sub(r'<td[^>]*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', '', text)
    text = html_mod.unescape(text)
    text = re.sub(r'\s+', ' ', text)

    for line in text.split('\n'):
        line = line.strip()
        if not line:
            continue
        m = re.search(rf'\b{re.escape(label)}[\s:]*(.+)', line, re.IGNORECASE)
        if m:
            val = m.group(1).strip()
            if val:
                return val
    return None


def scrape_property_detail(prop: dict) -> dict:
    url = prop.get("detail_url", "")
    if not url:
        return {}

    logger.info("Fetching detail page: %s", url)
    html = fetch_html(url)
    if not html:
        return {}

    result = {
        "id": f"irs-{prop.get('sale_number', '')}",
        "address": "", "city": "", "state": "", "zip": "",
        "price": None, "estimated_value": None,
        "beds": None, "baths": None, "sqft": None,
        "property_type": normalize_property_type(prop.get("raw_type", "")),
        "auction_date": None, "auction_type": "Government",
        "source": "IRS Auctions", "source_url": url,
        "description": "", "image_url": "",
        "status": "Active", "latitude": 0.0, "longitude": 0.0,
    }

    # Address
    title_match = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE)
    if title_match:
        t = title_match.group(1).strip()
        if re.search(r"\d", t) and "," in t:
            a = parse_address(t)
            result.update(a)

    if not result["address"]:
        img_match = re.search(r'<img[^>]*src="images/[^"]*"\s+alt="([^"]+)"[^>]*>', html, re.IGNORECASE)
        if img_match:
            alt = img_match.group(1).strip()
            if re.search(r"\d", alt) and "," in alt:
                a = parse_address(alt)
                result.update(a)

    if not result["address"]:
        raw = prop.get("address_raw", "")
        if raw:
            a = parse_address(raw)
            result.update(a)

    # Price
    price_raw = _extract_value_after_label(html, "Starting Bid")
    if price_raw:
        result["price"] = parse_money(price_raw)

    # Auction date
    auction_raw = _extract_value_after_label(html, "Auction Date and Time")
    if auction_raw:
        result["auction_date"] = parse_auction_date(auction_raw)
    else:
        result["auction_date"] = parse_auction_date(prop.get("auction_date_raw", ""))

    # Specs
    specs = {}
    for label, key in [
        ("Living Space", "sqft_raw"),
        ("Site Area", "site_area"),
        ("Year Built", "year_built"),
        ("County", "county"),
        ("Utilities", "utilities"),
        ("Zoning", "zoning"),
        ("Parcel No", "parcel"),
        ("Sale Number", "sale_number"),
    ]:
        val = _extract_value_after_label(html, label)
        if val:
            specs[key] = val

    if "sqft_raw" in specs:
        m = re.search(r"([0-9,]+)\s*[\u00b1+-]?\s*sq\.?\s*ft", specs["sqft_raw"], re.IGNORECASE)
        if m:
            try:
                result["sqft"] = int(m.group(1).replace(",", ""))
            except ValueError:
                pass

    # Description and beds/baths
    desc_match = re.search(r'<p\s+class="style10"[^>]*>(.*?)</p>', html, re.DOTALL | re.IGNORECASE)
    detail_desc = ""
    if desc_match:
        detail_desc = re.sub(r"<[^>]+>", "", desc_match.group(1)).strip()
        detail_desc = html_mod.unescape(detail_desc)
        detail_desc = re.sub(r"\s+", " ", detail_desc)

    listing_desc = prop.get("description", "")
    combined_desc = f"{detail_desc} {listing_desc}".strip()

    bed_bath_sqft = parse_sqft_beds_baths_from_desc(combined_desc)
    if bed_bath_sqft["beds"] is not None:
        result["beds"] = bed_bath_sqft["beds"]
    if bed_bath_sqft["baths"] is not None:
        result["baths"] = bed_bath_sqft["baths"]
    if result["sqft"] is None and bed_bath_sqft["sqft"] is not None:
        result["sqft"] = bed_bath_sqft["sqft"]

    # Fallback: numeric beds/baths from raw HTML
    if result["beds"] is None:
        bm = re.search(r"(\d+)\s*[\u00b1+-]?\s*bedroom", html, re.IGNORECASE)
        if bm:
            result["beds"] = int(bm.group(1))
    if result["baths"] is None:
        bm = re.search(r"(\d+(?:\.\d+)?)\s*[\u00b1+-]?\s*bath", html, re.IGNORECASE)
        if bm:
            try:
                result["baths"] = float(bm.group(1))
            except ValueError:
                pass

    # Build description
    parts = []
    if prop.get("raw_type"):
        parts.append(f"Type: {prop['raw_type']}.")
    if detail_desc:
        parts.append(detail_desc)
    elif listing_desc:
        parts.append(listing_desc)
    for key, label in [("site_area", "Site"), ("year_built", "Year Built"),
                       ("county", "County"), ("zoning", "Zoning"),
                       ("utilities", "Utilities")]:
        if key in specs:
            parts.append(f"{label}: {specs[key]}.")
    result["description"] = " ".join(parts).strip()

    # Image URL
    all_imgs = re.findall(
        r'<img[^>]*src="(images/[^"]+\.(?:gif|jpg|jpeg|png))"[^>]*alt="([^"]*)"[^>]*>',
        html, re.IGNORECASE,
    )
    skip_prefixes = ("type_", "spacer")
    skip_alts = ("blue rule line", "land with dwelling", "single family home",
                 "commercial building", "estate property", "condo", "townhouse")
    chosen_img = None
    chosen_alt = ""
    for src, alt in all_imgs:
        alt_lc = alt.lower()
        src_name = src.split("/")[-1].lower()
        if any(src_name.startswith(p) for p in skip_prefixes):
            continue
        if any(skip in alt_lc for skip in skip_alts):
            continue
        if re.search(r"\d", alt) and "," in alt:
            chosen_img = src
            chosen_alt = alt
            break
        if chosen_img is None:
            chosen_img = src
            chosen_alt = alt

    if chosen_img:
        result["image_url"] = urljoin(url, chosen_img)
    else:
        img_match = re.search(r'<img[^>]*src="(images/[^"]+\.(?:gif|jpg|jpeg|png))"[^>]*>', html, re.IGNORECASE)
        if img_match:
            result["image_url"] = urljoin(url, img_match.group(1))

    if result["price"]:
        result["estimated_value"] = int(result["price"] * 1.5)

    sale_num = prop.get("sale_number", "")
    if not sale_num and "sale_number" in specs:
        sale_num = specs["sale_number"]
    if sale_num:
        result["id"] = f"irs-{sale_num}"
    else:
        addr_hash = hashlib.md5(result["address"].encode()).hexdigest()[:8]
        result["id"] = f"irs-{addr_hash}"

    return result


def geocode_property(prop: dict) -> dict:
    if not prop.get("address") or not prop.get("city") or not prop.get("state"):
        return prop
    full_addr = f"{prop['address']}, {prop['city']}, {prop['state']} {prop.get('zip', '')}"
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {"q": full_addr, "format": "json", "limit": 1}
        headers = {"User-Agent": "PropertyActionScraper/1.0"}
        resp = requests.get(url, params=params, headers=headers, timeout=15)
        data = resp.json()
        if data:
            prop["latitude"] = float(data[0].get("lat", 0))
            prop["longitude"] = float(data[0].get("lon", 0))
    except Exception as e:
        logger.debug("Geocoding failed for %s: %s", full_addr, e)
    return prop


def scrape_treasury_auctions(include_geocode: bool = False) -> list[dict]:
    logger.info("Starting Treasury/IRS auction scraper...")
    listings = scrape_listing_page()
    if not listings:
        logger.warning("No listings found.")
        return []
    results = []
    for listing in listings:
        detail = scrape_property_detail(listing)
        if detail and detail.get("address"):
            if include_geocode:
                detail = geocode_property(detail)
            results.append(detail)
    logger.info("Scraper complete. Found %d properties.", len(results))
    return results


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Scrape Treasury/IRS seized property auctions")
    parser.add_argument("--geocode", action="store_true", help="Enable address geocoding via Nominatim")
    parser.add_argument("--output", "-o", default="treasury_properties.json", help="Output JSON file")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output")
    args = parser.parse_args()

    properties = scrape_treasury_auctions(include_geocode=args.geocode)
    indent = 2 if args.pretty else None
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(properties, f, indent=indent, ensure_ascii=False)

    print(f"Saved {len(properties)} properties to {args.output}")
    if properties:
        print("\n--- Sample Property ---")
        print(json.dumps(properties[0], indent=2))


if __name__ == "__main__":
    main()
