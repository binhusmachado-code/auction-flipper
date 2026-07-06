#!/usr/bin/env python3
"""
Auction Flipper - Property Scraper
Fetches live foreclosure/auction listings from free US sources.

Usage:
    python3 scraper.py              # Generate enhanced sample data + try live sources
    python3 scraper.py --hud         # Scrape HUD Home Store (requires Playwright)
    python3 scraper.py --output ../src/data/live_properties.json
"""

import json
import time
import argparse
import re
import random
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict

import requests
from bs4 import BeautifulSoup

try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://weguwjxuvibbyqrrvqcw.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_JauuTENFT1-RfVMhL7FJPQ_VtSxzhGI")


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
    lot_size: Optional[float]
    year_built: Optional[int]
    property_type: str
    auction_date: Optional[str]
    auction_type: str
    source: str
    source_url: str
    description: str
    image_url: str
    status: str = "Active"
    days_on_market: int = 0
    rehab_estimate: int = 0
    arv: int = 0
    notes: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    county: str = ""
    case_number: Optional[str] = None
    opening_bid: Optional[int] = None
    deposit_required: Optional[int] = None

    def to_app_format(self) -> Dict[str, Any]:
        """Convert to the format expected by the Auction Flipper app."""
        return {
            "id": self.id,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "zip": self.zip,
            "price": self.price,
            "estimatedValue": self.estimated_value,
            "beds": self.beds,
            "baths": self.baths,
            "sqft": self.sqft,
            "lotSize": self.lot_size,
            "yearBuilt": self.year_built,
            "propertyType": self.property_type,
            "auctionDate": self.auction_date,
            "auctionType": self.auction_type,
            "source": self.source,
            "sourceUrl": self.source_url,
            "description": self.description,
            "imageUrl": self.image_url,
            "images": [],
            "status": self.status,
            "daysOnMarket": self.days_on_market,
            "rehabEstimate": self.rehab_estimate,
            "arv": self.arv,
            "notes": self.notes,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "county": self.county,
            "caseNumber": self.case_number,
            "openingBid": self.opening_bid,
            "depositRequired": self.deposit_required,
        }


def push_to_supabase(properties: List[ScrapedProperty]):
    """Push properties directly to Supabase database."""
    print(f"📡 Pushing {len(properties)} properties to Supabase...")
    url = f"{SUPABASE_URL}/rest/v1/properties"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    key_map = {
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
    
    inserted = 0
    errors = []
    
    for p in properties:
        data = p.to_app_format()
        row = {key_map.get(k, k): v for k, v in data.items()}
        if not row.get("images"):
            row["images"] = []
        
        try:
            resp = requests.post(url, headers=headers, json=row, timeout=30)
            if resp.status_code in (200, 201):
                inserted += 1
            else:
                errors.append(f"{p.id}: {resp.status_code} - {resp.text[:100]}")
        except Exception as e:
            errors.append(f"{p.id}: {str(e)}")
        
        time.sleep(0.05)
    
    print(f"✅ Inserted {inserted}/{len(properties)} properties to Supabase")
    if errors:
        print(f"⚠️ {len(errors)} errors:")
        for e in errors[:5]:
            print(f"   {e}")
    return inserted


class BaseScraper:
    """Base class for all scrapers."""
    
    USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    
    def __init__(self, delay: float = 1.0):
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": self.USER_AGENT})
    
    def _get(self, url: str, **kwargs) -> requests.Response:
        time.sleep(self.delay)
        return self.session.get(url, timeout=30, **kwargs)
    
    def scrape(self) -> List[ScrapedProperty]:
        raise NotImplementedError


class HUDScraper(BaseScraper):
    """Scraper for HUD Home Store (hudhomestore.com)."""
    
    BASE_URL = "https://www.hudhomestore.com"
    SEARCH_URL = "https://www.hudhomestore.com/Listing/PropertySearchResult"
    
    def scrape(self) -> List[ScrapedProperty]:
        if not PLAYWRIGHT_AVAILABLE:
            print("⚠️  Playwright not installed. Run: pip install playwright && playwright install chromium")
            return []
        
        properties = []
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                
                print("🌐 Loading HUD Home Store...")
                page.goto(self.SEARCH_URL, wait_until="networkidle", timeout=60000)
                page.wait_for_selector(".property-listing, .listing-item, .property-card", timeout=30000)
                
                cards = page.query_selector_all(".property-listing, .listing-item, .property-card")
                print(f"📋 Found {len(cards)} HUD listings")
                
                for card in cards:
                    try:
                        prop = self._parse_card(card)
                        if prop:
                            properties.append(prop)
                    except Exception as e:
                        print(f"   ⚠️  Skipped: {e}")
                
                browser.close()
        except Exception as e:
            print(f"❌ HUD scraper failed: {e}")
        
        return properties
    
    def _parse_card(self, card) -> Optional[ScrapedProperty]:
        address = self._extract_text(card, ".address, [class*='address'], h3")
        if not address:
            return None
        
        city_state = self._extract_text(card, ".city, [class*='city']")
        city, state, zip_code = self._parse_location(city_state or "")
        
        price = self._parse_price(self._extract_text(card, ".price, [class*='price']"))
        beds = self._extract_number(card, ".beds, [class*='bed']")
        baths = self._extract_number(card, ".baths, [class*='bath']")
        sqft = self._extract_number(card, ".sqft, [class*='sqft']")
        image = self._extract_attr(card, "img", "src") or "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"
        
        estimated = int(price * 1.6) if price > 0 else 0
        arv = int(price * 1.8) if price > 0 else 0
        rehab = int(price * 0.3) if price > 0 else 0
        
        return ScrapedProperty(
            id=f"hud-{hash(address) & 0xFFFFFFFF}",
            address=address,
            city=city or "Unknown",
            state=state or "",
            zip=zip_code or "",
            price=price,
            estimated_value=estimated,
            beds=beds or 0,
            baths=baths or 0,
            sqft=sqft or 0,
            lot_size=None,
            year_built=None,
            property_type="Single Family",
            auction_date=None,
            auction_type="REO",
            source="HUD Home Store",
            source_url=self.BASE_URL,
            description=f"HUD REO property. Listed at ${price:,}.",
            image_url=image,
            rehab_estimate=rehab,
            arv=arv,
            notes="Scraped from HUD Home Store. Verify details before bidding.",
        )
    
    def _extract_text(self, element, selector: str) -> Optional[str]:
        try:
            child = element.query_selector(selector)
            if child:
                return child.inner_text().strip()
        except:
            pass
        return None
    
    def _extract_attr(self, element, selector: str, attr: str) -> Optional[str]:
        try:
            child = element.query_selector(selector)
            if child:
                return child.get_attribute(attr)
        except:
            pass
        return None
    
    def _extract_number(self, element, selector: str) -> Optional[int]:
        text = self._extract_text(element, selector)
        if text:
            match = re.search(r'(\d+)', text.replace(',', ''))
            if match:
                return int(match.group(1))
        return None
    
    def _parse_location(self, text: str) -> tuple:
        parts = [p.strip() for p in text.split(',')]
        city = parts[0] if len(parts) > 0 else ""
        state_zip = parts[1].split() if len(parts) > 1 else []
        state = state_zip[0] if len(state_zip) > 0 else ""
        zip_code = state_zip[1] if len(state_zip) > 1 else ""
        return city, state, zip_code
    
    def _parse_price(self, text: Optional[str]) -> int:
        if not text:
            return 0
        cleaned = text.replace('$', '').replace(',', '').replace(' ', '')
        match = re.search(r'(\d+)', cleaned)
        return int(match.group(1)) if match else 0


class AuctionComScraper(BaseScraper):
    """Scraper for Auction.com public listings."""
    
    BASE_URL = "https://www.auction.com"
    API_URL = "https://www.auction.com/res/search/execute?p=1&ps=50&fc=9999&location=usa"
    
    def scrape(self) -> List[ScrapedProperty]:
        properties = []
        try:
            print("🌐 Loading Auction.com listings...")
            resp = self._get(self.API_URL, headers={
                "Accept": "application/json",
                "Referer": "https://www.auction.com/",
            })
            
            if resp.status_code == 200:
                data = resp.json()
                listings = data.get("results", []) if isinstance(data, dict) else []
                print(f"📋 Found {len(listings)} Auction.com listings")
                
                for item in listings:
                    try:
                        prop = self._parse_item(item)
                        if prop:
                            properties.append(prop)
                    except Exception as e:
                        print(f"   ⚠️  Skipped: {e}")
            else:
                print(f"   ⚠️  Auction.com returned status {resp.status_code}")
        except Exception as e:
            print(f"❌ Auction.com scraper failed: {e}")
        
        return properties
    
    def _parse_item(self, item: Dict) -> Optional[ScrapedProperty]:
        address = item.get("address", {}).get("street", "")
        if not address:
            return None
        
        price = int(item.get("price", 0) or item.get("openingBid", 0))
        estimated = int(item.get("estValue", 0) or price * 1.5)
        arv = int(item.get("arv", 0) or estimated * 1.1)
        rehab = int(item.get("rehab", 0) or price * 0.25)
        
        return ScrapedProperty(
            id=f"auction-{item.get('id', hash(address) & 0xFFFFFFFF)}",
            address=address,
            city=item.get("address", {}).get("city", ""),
            state=item.get("address", {}).get("state", ""),
            zip=item.get("address", {}).get("zip", ""),
            price=price,
            estimated_value=estimated,
            beds=item.get("beds", 0) or 0,
            baths=item.get("baths", 0) or 0,
            sqft=item.get("sqft", 0) or 0,
            lot_size=item.get("lotSize"),
            year_built=item.get("yearBuilt"),
            property_type=item.get("propertyType", "Single Family"),
            auction_date=item.get("auctionDate") or None,
            auction_type="Foreclosure",
            source="Auction.com",
            source_url=f"{self.BASE_URL}/listing/{item.get('id', '')}",
            description=item.get("description", f"Auction.com foreclosure listing."),
            image_url=item.get("imageUrl", "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"),
            rehab_estimate=rehab,
            arv=arv,
            notes="Scraped from Auction.com. Verify auction date and deposit requirements.",
            latitude=item.get("lat", 0),
            longitude=item.get("lng", 0),
            county=item.get("county", ""),
            case_number=item.get("caseNumber"),
            opening_bid=price if price > 0 else None,
            deposit_required=item.get("deposit"),
        )


class SampleDataScraper(BaseScraper):
    """Generates enhanced sample data from real market patterns."""
    
    def scrape(self, count: int = 50) -> List[ScrapedProperty]:
        print(f"📊 Generating {count} enhanced sample properties across nationwide markets...")
        
        markets = [
            # Southeast
            {"city": "Atlanta", "state": "GA", "lat": 33.749, "lng": -84.388, "price_range": (120000, 200000), "arv_mult": 1.9, "rehab_pct": 0.35},
            {"city": "Jacksonville", "state": "FL", "lat": 30.332, "lng": -81.656, "price_range": (80000, 160000), "arv_mult": 2.0, "rehab_pct": 0.40},
            {"city": "Miami", "state": "FL", "lat": 25.762, "lng": -80.192, "price_range": (150000, 300000), "arv_mult": 1.8, "rehab_pct": 0.30},
            {"city": "Charlotte", "state": "NC", "lat": 35.227, "lng": -80.843, "price_range": (110000, 190000), "arv_mult": 1.9, "rehab_pct": 0.32},
            {"city": "Birmingham", "state": "AL", "lat": 33.521, "lng": -86.812, "price_range": (60000, 120000), "arv_mult": 2.1, "rehab_pct": 0.42},
            {"city": "Memphis", "state": "TN", "lat": 35.150, "lng": -90.049, "price_range": (70000, 150000), "arv_mult": 1.9, "rehab_pct": 0.38},
            {"city": "Baton Rouge", "state": "LA", "lat": 30.451, "lng": -91.187, "price_range": (40000, 90000), "arv_mult": 2.3, "rehab_pct": 0.50},
            {"city": "New Orleans", "state": "LA", "lat": 29.951, "lng": -90.072, "price_range": (50000, 110000), "arv_mult": 2.2, "rehab_pct": 0.45},
            # Midwest
            {"city": "Detroit", "state": "MI", "lat": 42.331, "lng": -83.046, "price_range": (40000, 100000), "arv_mult": 2.2, "rehab_pct": 0.45},
            {"city": "Cleveland", "state": "OH", "lat": 41.499, "lng": -81.694, "price_range": (60000, 140000), "arv_mult": 2.1, "rehab_pct": 0.42},
            {"city": "Columbus", "state": "OH", "lat": 39.961, "lng": -82.998, "price_range": (80000, 150000), "arv_mult": 2.0, "rehab_pct": 0.38},
            {"city": "Indianapolis", "state": "IN", "lat": 39.769, "lng": -86.158, "price_range": (70000, 140000), "arv_mult": 2.0, "rehab_pct": 0.38},
            {"city": "Kansas City", "state": "MO", "lat": 39.100, "lng": -94.579, "price_range": (90000, 180000), "arv_mult": 1.8, "rehab_pct": 0.35},
            {"city": "St. Louis", "state": "MO", "lat": 38.627, "lng": -90.199, "price_range": (50000, 110000), "arv_mult": 2.1, "rehab_pct": 0.42},
            {"city": "Chicago", "state": "IL", "lat": 41.878, "lng": -87.630, "price_range": (100000, 220000), "arv_mult": 1.8, "rehab_pct": 0.32},
            {"city": "Milwaukee", "state": "WI", "lat": 43.039, "lng": -87.906, "price_range": (50000, 120000), "arv_mult": 2.1, "rehab_pct": 0.42},
            # Southwest / West
            {"city": "Houston", "state": "TX", "lat": 29.760, "lng": -95.370, "price_range": (150000, 280000), "arv_mult": 1.8, "rehab_pct": 0.30},
            {"city": "Dallas", "state": "TX", "lat": 32.777, "lng": -96.797, "price_range": (130000, 250000), "arv_mult": 1.8, "rehab_pct": 0.30},
            {"city": "San Antonio", "state": "TX", "lat": 29.425, "lng": -98.494, "price_range": (90000, 180000), "arv_mult": 1.9, "rehab_pct": 0.35},
            {"city": "Phoenix", "state": "AZ", "lat": 33.448, "lng": -112.074, "price_range": (200000, 350000), "arv_mult": 1.6, "rehab_pct": 0.25},
            {"city": "Tucson", "state": "AZ", "lat": 32.223, "lng": -110.926, "price_range": (160000, 260000), "arv_mult": 1.7, "rehab_pct": 0.28},
            {"city": "Las Vegas", "state": "NV", "lat": 36.170, "lng": -115.140, "price_range": (140000, 280000), "arv_mult": 1.8, "rehab_pct": 0.30},
            # Northeast
            {"city": "Philadelphia", "state": "PA", "lat": 39.952, "lng": -75.165, "price_range": (60000, 140000), "arv_mult": 2.0, "rehab_pct": 0.38},
            {"city": "Baltimore", "state": "MD", "lat": 39.290, "lng": -76.612, "price_range": (50000, 120000), "arv_mult": 2.1, "rehab_pct": 0.42},
            {"city": "Pittsburgh", "state": "PA", "lat": 40.441, "lng": -79.996, "price_range": (50000, 110000), "arv_mult": 2.1, "rehab_pct": 0.40},
            # West Coast
            {"city": "Riverside", "state": "CA", "lat": 33.953, "lng": -117.396, "price_range": (180000, 350000), "arv_mult": 1.6, "rehab_pct": 0.28},
            {"city": "Sacramento", "state": "CA", "lat": 38.582, "lng": -121.494, "price_range": (150000, 280000), "arv_mult": 1.7, "rehab_pct": 0.28},
            {"city": "Portland", "state": "OR", "lat": 45.515, "lng": -122.679, "price_range": (140000, 260000), "arv_mult": 1.8, "rehab_pct": 0.30},
            {"city": "Seattle", "state": "WA", "lat": 47.606, "lng": -122.332, "price_range": (200000, 380000), "arv_mult": 1.6, "rehab_pct": 0.25},
        ]
        
        auction_types = ["Foreclosure", "Tax Lien", "REO", "Courthouse", "Government", "Estate"]
        sources = {
            "Foreclosure": ("County Courthouse", "https://www.countyrecords.com"),
            "Tax Lien": ("County Tax Collector", "https://www.taxsale.com"),
            "REO": ("HUD Home Store", "https://www.hudhomestore.com"),
            "Courthouse": ("County Sheriff", "https://www.sheriff.com"),
            "Government": ("GSA Auctions", "https://gsaauctions.gov"),
            "Estate": ("Estate Auction", "#"),
        }
        
        streets = ["Oak", "Maple", "Pine", "Cedar", "Elm", "Birch", "Willow", "Magnolia",
                   "Cherry", "Walnut", "Peach", "Briar", "Ridge", "Grove", "Haven", "Meadow",
                   "Spruce", "Ash", "Sycamore", "Dogwood", "Hickory", "Cypress", "Juniper"]
        types = ["Street", "Avenue", "Drive", "Lane", "Road", "Boulevard", "Trail", "Way", "Court", "Circle"]
        
        images = [
            "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
            "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800",
            "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800",
            "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800",
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
            "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800",
            "https://images.unsplash.com/photo-1600585154345-be6161a56a0c?w=800",
            "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800",
        ]
        
        random.seed(42)
        
        properties = []
        for i in range(count):
            market = random.choice(markets)
            price = random.randint(*market["price_range"])
            price = (price // 1000) * 1000
            
            estimated = int(price * market["arv_mult"])
            arv = int(estimated * 1.1)
            rehab = int(price * market["rehab_pct"])
            
            auction_type = random.choice(auction_types)
            source, source_url = sources[auction_type]
            
            street_num = random.randint(100, 9999)
            street_name = f"{random.choice(streets)} {random.choice(types)}"
            
            beds = random.choice([2, 3, 3, 4, 4, 4, 5])
            baths = random.choice([1, 1.5, 2, 2, 2.5, 3])
            sqft = random.randint(900, 2500)
            
            days_ahead = random.randint(3, 90)
            auction_date = (datetime.now() + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
            
            opening_bid = int(price * random.uniform(0.8, 0.95))
            
            property_type = random.choice(["Single Family", "Single Family", "Single Family", 
                                          "Condo", "Townhouse", "Multi-Family"])
            
            properties.append(ScrapedProperty(
                id=f"live-{i+1:04d}",
                address=f"{street_num} {street_name}",
                city=market["city"],
                state=market["state"],
                zip=f"{random.randint(10000, 99999):05d}",
                price=price,
                estimated_value=estimated,
                beds=beds,
                baths=baths,
                sqft=sqft,
                lot_size=round(random.uniform(0.15, 0.6), 2),
                year_built=random.randint(1950, 2015),
                property_type=property_type,
                auction_date=auction_date,
                auction_type=auction_type,
                source=source,
                source_url=source_url,
                description=f"{auction_type} property in {market['city']}. Listed ${price:,}. Estimated ARV ${arv:,}. Rehab estimated at ${rehab:,}.",
                image_url=images[i % len(images)],
                status="Active",
                days_on_market=random.randint(1, 45),
                rehab_estimate=rehab,
                arv=arv,
                notes=f"Market: {market['city']}, {market['state']}. Discount: {((estimated - price) / estimated * 100):.0f}% below market. Potential profit: ${arv - price - rehab:,}.",
                latitude=market["lat"] + random.uniform(-0.03, 0.03),
                longitude=market["lng"] + random.uniform(-0.03, 0.03),
                county="",
                case_number=f"{auction_type[:2].upper()}-{market['state']}-{street_num}",
                opening_bid=opening_bid,
                deposit_required=int(price * random.uniform(0.02, 0.05)),
            ))
        
        print(f"✅ Generated {len(properties)} sample properties across {len(set(p.city for p in properties))} cities")
        return properties


def merge_and_save(properties: List[ScrapedProperty], output_path: str, merge_with_existing: bool = True):
    """Merge new properties with existing data and save as JSON."""
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    
    existing = []
    if merge_with_existing and output.exists():
        try:
            with open(output, "r") as f:
                existing = json.load(f)
            print(f"📂 Loaded {len(existing)} existing properties")
        except:
            pass
    
    new_data = [p.to_app_format() for p in properties]
    
    seen_ids = {p["id"] for p in new_data}
    merged = new_data + [p for p in existing if p["id"] not in seen_ids]
    
    merged.sort(key=lambda p: ((p.get("estimatedValue", 0) - p.get("price", 0)) / max(p.get("estimatedValue", 1), 1)), reverse=True)
    
    with open(output, "w") as f:
        json.dump(merged, f, indent=2)
    
    print(f"💾 Saved {len(merged)} total properties to {output_path}")
    
    print(f"\n📊 Summary:")
    print(f"   Total properties: {len(merged)}")
    if merged:
        avg_price = sum(p["price"] for p in merged) / len(merged)
        avg_discount = sum((p["estimatedValue"] - p["price"]) / max(p["estimatedValue"], 1) * 100 for p in merged) / len(merged)
        total_profit = sum(max(0, p["arv"] - p["price"] - p["rehabEstimate"]) for p in merged)
        print(f"   Average price: ${avg_price:,.0f}")
        print(f"   Average discount: {avg_discount:.1f}%")
        print(f"   Total profit potential: ${total_profit:,.0f}")
    
    return merged


def main():
    parser = argparse.ArgumentParser(description="Auction Flipper Property Scraper")
    parser.add_argument("--output", "-o", default="../src/data/live_properties.json", help="Output JSON file path")
    parser.add_argument("--hud", action="store_true", help="Scrape HUD Home Store only")
    parser.add_argument("--auction", action="store_true", help="Scrape Auction.com only")
    parser.add_argument("--sample", action="store_true", help="Generate enhanced sample data only")
    parser.add_argument("--all", action="store_true", help="Scrape all sources")
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between requests (seconds)")
    parser.add_argument("--no-merge", action="store_true", help="Don't merge with existing data")
    parser.add_argument("--supabase", action="store_true", help="Push to Supabase database")
    parser.add_argument("--count", type=int, default=50, help="Number of sample properties to generate")
    args = parser.parse_args()
    
    print("=" * 60)
    print("🏠 Auction Flipper - Property Scraper")
    print("=" * 60)
    print()
    
    all_properties = []
    
    if not any([args.hud, args.auction, args.sample]):
        args.all = True
    
    if args.all or args.hud:
        hud = HUDScraper(delay=args.delay)
        props = hud.scrape()
        all_properties.extend(props)
    
    if args.all or args.auction:
        auction = AuctionComScraper(delay=args.delay)
        props = auction.scrape()
        all_properties.extend(props)
    
    if args.all or args.sample or not all_properties:
        sample = SampleDataScraper()
        props = sample.scrape(count=args.count)
        all_properties.extend(props)
    
    if all_properties:
        if args.supabase:
            push_to_supabase(all_properties)
        else:
            merge_and_save(all_properties, args.output, merge_with_existing=not args.no_merge)
    else:
        print("❌ No properties scraped. Check your internet connection.")
    
    print()
    print("=" * 60)
    print("✅ Done!")
    print("=" * 60)


if __name__ == "__main__":
    main()
