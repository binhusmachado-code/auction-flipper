import json
import re

data = json.load(open('gsa_all.json'))

# Look for items that mention "real property" or "real estate" explicitly
print("=== Items mentioning 'real property' or 'real estate' ===")
for p in data:
    if 'real property' in p['description'].lower() or 'real estate' in p['description'].lower():
        print(f"  {p['id']} | {p['property_type']} | ${p['price']:,} | {p['address']}")
        print(f"    Notes: {p['notes']}")

# Look for items with "acre" in description
print("\n=== Items mentioning 'acre' ===")
for p in data:
    if 'acre' in p['description'].lower():
        print(f"  {p['id']} | {p['property_type']} | ${p['price']:,} | {p['address']}")
        print(f"    Desc: {p['description'][:200]}")

# Look for items at 610 TRUS JOIST LANE (the FEMA manufactured homes)
print("\n=== Items at 610 TRUS JOIST LANE ===")
for p in data:
    if '610 TRUS' in p['address'].upper():
        print(f"  {p['id']} | {p['property_type']} | ${p['price']:,} | {p['address']}")
        print(f"    Desc: {p['description'][:150]}")

# Check if any items have sale numbers with "QSC-S" (sealed bid) vs "QSC-I" (internet)
print("\n=== Sale number patterns ===")
patterns = {}
for p in data:
    sale = p['id'].split('-')[2] if '-' in p['id'] else ''
    patterns[sale] = patterns.get(sale, 0) + 1
for pat, count in sorted(patterns.items()):
    print(f"  {pat}: {count}")
