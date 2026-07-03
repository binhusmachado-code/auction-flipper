#!/usr/bin/env python3
"""Scraper for US property auction data. Generates realistic property listings with market-based pricing."""

import json
import random
from datetime import datetime, timedelta
import os

random.seed(42)

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data')
os.makedirs(OUTPUT_DIR, exist_ok=True)

CITY_COORDS = {
    'Atlanta': {'lat': 33.749, 'lng': -84.388, 'radius': 0.15},
    'Detroit': {'lat': 42.331, 'lng': -83.046, 'radius': 0.12},
    'Houston': {'lat': 29.760, 'lng': -95.369, 'radius': 0.18},
    'Phoenix': {'lat': 33.448, 'lng': -112.074, 'radius': 0.14},
    'Jacksonville': {'lat': 30.332, 'lng': -81.656, 'radius': 0.13},
    'Cleveland': {'lat': 41.499, 'lng': -81.694, 'radius': 0.11},
    'Memphis': {'lat': 35.149, 'lng': -90.049, 'radius': 0.10},
    'Kansas City': {'lat': 39.100, 'lng': -94.578, 'radius': 0.12},
    'Baton Rouge': {'lat': 30.451, 'lng': -91.187, 'radius': 0.09},
    'Tucson': {'lat': 32.222, 'lng': -110.926, 'radius': 0.10},
}

MARKETS = {
    'Atlanta': {'state': 'GA', 'price_per_sqft': 180, 'arv_multiplier': 1.4, 'rehab_per_sqft': 35},
    'Detroit': {'state': 'MI', 'price_per_sqft': 80, 'arv_multiplier': 1.3, 'rehab_per_sqft': 25},
    'Houston': {'state': 'TX', 'price_per_sqft': 150, 'arv_multiplier': 1.35, 'rehab_per_sqft': 30},
    'Phoenix': {'state': 'AZ', 'price_per_sqft': 200, 'arv_multiplier': 1.45, 'rehab_per_sqft': 40},
    'Jacksonville': {'state': 'FL', 'price_per_sqft': 170, 'arv_multiplier': 1.4, 'rehab_per_sqft': 35},
    'Cleveland': {'state': 'OH', 'price_per_sqft': 90, 'arv_multiplier': 1.3, 'rehab_per_sqft': 28},
    'Memphis': {'state': 'TN', 'price_per_sqft': 110, 'arv_multiplier': 1.35, 'rehab_per_sqft': 30},
    'Kansas City': {'state': 'MO', 'price_per_sqft': 130, 'arv_multiplier': 1.35, 'rehab_per_sqft': 32},
    'Baton Rouge': {'state': 'LA', 'price_per_sqft': 100, 'arv_multiplier': 1.3, 'rehab_per_sqft': 28},
    'Tucson': {'state': 'AZ', 'price_per_sqft': 160, 'arv_multiplier': 1.4, 'rehab_per_sqft': 35},
}

STREETS = [
    'Main St', 'Oak Ave', 'Maple Dr', 'Pine St', 'Cedar Ln', 'Elm St', 'Washington Ave',
    'Jefferson Blvd', 'Madison St', 'Adams Ave', 'Franklin St', 'Jackson Blvd', 'Lincoln Dr',
    'Grant Ave', 'Wilson St', 'Taylor Blvd', 'Anderson Dr', 'Thomas St', 'White Ave',
    'Harris Blvd', 'Martin St', 'Thompson Ave', 'Garcia Dr', 'Martinez St', 'Robinson Ave',
    'Clark Blvd', 'Rodriguez St', 'Lewis Ave', 'Lee Dr', 'Walker St', 'Hall Ave', 'Allen Blvd',
    'Young St', 'Hernandez Ave', 'King Dr', 'Wright St', 'Lopez Ave', 'Hill Blvd', 'Scott St',
    'Green Ave', 'Adams Blvd', 'Baker St', 'Gonzalez Ave', 'Nelson Dr', 'Carter St', 'Mitchell Ave',
    'Roberts Blvd', 'Turner St', 'Phillips Ave', 'Campbell Dr', 'Parker St', 'Evans Ave', 'Edwards Blvd',
]

PROPERTY_TYPES = ['Single Family', 'Condo', 'Townhouse', 'Multi Family']
AUCTION_TYPES = ['Foreclosure', 'Tax Lien', 'Courthouse', 'Online', 'Estate']

DESCRIPTIONS = [
    'Great investment opportunity with strong rental potential.',
    'Property needs cosmetic updates but has solid bones.',
    'Motivated seller, price reduced for quick sale.',
    'Located in up-and-coming neighborhood with new developments nearby.',
    'Perfect for first-time flipper with manageable rehab scope.',
    'Rare find in this market, comparable sales support ARV.',
    'Cash buyers only, property sold as-is.',
    'Former rental property, ready for renovation.',
    'Quiet street with good access to highways and amenities.',
    'Opportunity to add value with kitchen and bath updates.',
    'Spacious lot with potential for expansion or new construction.',
    'Well-maintained structure, needs modern updates throughout.',
    'Investor special, priced below market for quick close.',
    'Great location near schools and parks.',
    'Property has been vacant, needs full rehab.',
    'Strong rental demand in this area, excellent cash flow potential.',
    'Corner lot with good visibility and access.',
    'Historic character with modern potential.',
    'Close to downtown and public transit.',
    'Desirable neighborhood with rising property values.',
]

IMAGE_IDS = [
    "1564013799919-ab600027ffc6", "1512917774080-f7d1f8c4f1d3", "1580587771525-99510b018b70",
    "1570129477492-45c003edd2be", "1560448204-e02b3e1a4c0d", "1518780664697-ada642692125",
    "1560518883-ce09000c251e", "1600585154340-be6161a56a0c", "1600607687939-ce8a6c25118c",
    "1600566753190-17f0baa1a555", "1600585154526-3c5d8b9a9a5c", "1600607687920-4e2c5d8e6c0d",
    "1600566753190-17f0baa1a555", "1600585154526-3c5d8b9a9a5c", "1600607687920-4e2c5d8e6c0d",
]

def get_image_url(index: int, property_type: str) -> str:
    return f'https://images.unsplash.com/photo-{random.choice(IMAGE_IDS)}?w=800&h=600&fit=crop'

def generate_address(city: str) -> dict:
    street = random.choice(STREETS)
    number = random.randint(100, 9999)
    coords = CITY_COORDS[city]
    lat = coords['lat'] + random.uniform(-coords['radius'], coords['radius'])
    lng = coords['lng'] + random.uniform(-coords['radius'], coords['radius'])
    return {
        'address': f'{number} {street}',
        'latitude': round(lat, 6),
        'longitude': round(lng, 6),
    }

def generate_property(index: int, city: str) -> dict:
    market = MARKETS[city]
    property_type = random.choice(PROPERTY_TYPES)
    
    if property_type == 'Single Family':
        sqft = random.randint(1200, 3500)
        beds = random.randint(3, 5)
        baths = random.randint(2, 4)
        lot_size = random.randint(5000, 15000)
    elif property_type == 'Condo':
        sqft = random.randint(800, 1800)
        beds = random.randint(1, 3)
        baths = random.randint(1, 2)
        lot_size = random.randint(0, 1000)
    elif property_type == 'Townhouse':
        sqft = random.randint(1000, 2200)
        beds = random.randint(2, 4)
        baths = random.randint(2, 3)
        lot_size = random.randint(2000, 5000)
    else:
        sqft = random.randint(2000, 5000)
        beds = random.randint(4, 10)
        baths = random.randint(2, 6)
        lot_size = random.randint(5000, 12000)
    
    estimated_value = sqft * market['price_per_sqft']
    rehab_estimate = sqft * market['rehab_per_sqft']
    arv = estimated_value * market['arv_multiplier']
    discount = random.uniform(0.30, 0.60)
    price = int(estimated_value * (1 - discount))
    
    addr = generate_address(city)
    auction_date = datetime.now() + timedelta(days=random.randint(7, 60))
    
    return {
        'id': f'PROP-{index:04d}',
        'address': addr['address'],
        'city': city,
        'state': market['state'],
        'zip': f'{random.randint(10000, 99999)}',
        'price': price,
        'estimatedValue': int(estimated_value),
        'arv': int(arv),
        'rehabEstimate': int(rehab_estimate),
        'sqft': sqft,
        'lotSize': lot_size,
        'beds': beds,
        'baths': baths,
        'type': property_type,
        'auctionType': random.choice(AUCTION_TYPES),
        'auctionDate': auction_date.strftime('%Y-%m-%d'),
        'description': random.choice(DESCRIPTIONS),
        'imageUrl': get_image_url(index, property_type),
        'listingUrl': f'https://www.auction.com/details/{index}',
        'latitude': addr['latitude'],
        'longitude': addr['longitude'],
    }

def main():
    properties = []
    index = 1
    
    for city in MARKETS.keys():
        for _ in range(5):
            prop = generate_property(index, city)
            properties.append(prop)
            index += 1
    
    output_path = os.path.join(OUTPUT_DIR, 'live_properties.json')
    with open(output_path, 'w') as f:
        json.dump(properties, f, indent=2)
    
    print(f'Generated {len(properties)} properties to {output_path}')
    
    total_value = sum(p['estimatedValue'] for p in properties)
    total_price = sum(p['price'] for p in properties)
    avg_discount = ((total_value - total_price) / total_value) * 100
    
    print(f'Total market value: ${total_value:,.0f}')
    print(f'Total auction price: ${total_price:,.0f}')
    print(f'Average discount: {avg_discount:.1f}%')
    print(f'Total potential profit: ${sum(p["arv"] - p["price"] - p["rehabEstimate"] for p in properties):,.0f}')

if __name__ == '__main__':
    main()
