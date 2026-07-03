# Auction Flipper - Property Scraper

Fetches live foreclosure/auction property listings from free US sources.

## Installation

```bash
cd scraper
pip install -r requirements.txt
playwright install chromium
```

## Usage

```bash
# Generate 50 enhanced sample properties (default)
python3 scraper.py

# Try to scrape live HUD listings (requires Playwright headless browser)
python3 scraper.py --hud

# Try to scrape Auction.com listings
python3 scraper.py --auction

# Scrape everything
python3 scraper.py --all

# Custom output path
python3 scraper.py --output ../src/data/live_properties.json

# Generate fresh data without merging with existing
python3 scraper.py --no-merge
```

## Output

The scraper produces a JSON file matching the Auction Flipper app's property format. Import it into the app by updating `src/data/properties.ts` to load from the JSON file.

## Sources

- **HUD Home Store** (hudhomestore.com) — Federal REO properties
- **Auction.com** — Public foreclosure auctions
- **Sample Data** — Realistic market-based generated data (fallback)

## Notes

- HUD scraping requires Playwright because the site loads listings via JavaScript.
- Auction.com API may block requests; the scraper falls back to sample data if blocked.
- All scrapers include polite delays between requests to avoid rate limiting.
- Respect each site's `robots.txt` and Terms of Service.
