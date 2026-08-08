import json

data = json.load(open('gsa_all.json'))

# Group by property type
by_type = {}
for p in data:
    t = p['property_type']
    by_type.setdefault(t, []).append(p)

print("=== LAND (first 20) ===")
for p in by_type.get('Land', [])[:20]:
    print(f"  {p['id']:30} | ${p['price']:>8} | {p['address'][:40]:40} | {p['notes'][:50]}")

print("\n=== BUILDING (first 20) ===")
for p in by_type.get('Building', [])[:20]:
    print(f"  {p['id']:30} | ${p['price']:>8} | {p['address'][:40]:40} | {p['notes'][:50]}")

print("\n=== RESIDENTIAL (first 20) ===")
for p in by_type.get('Residential', [])[:20]:
    print(f"  {p['id']:30} | ${p['price']:>8} | {p['address'][:40]:40} | {p['notes'][:50]}")

print("\n=== COMMERCIAL (first 20) ===")
for p in by_type.get('Commercial', [])[:20]:
    print(f"  {p['id']:30} | ${p['price']:>8} | {p['address'][:40]:40} | {p['notes'][:50]}")

print("\n=== GOVERNMENT FACILITY (first 20) ===")
for p in by_type.get('Government Facility', [])[:20]:
    print(f"  {p['id']:30} | ${p['price']:>8} | {p['address'][:40]:40} | {p['notes'][:50]}")

# Look at items with price > $5000
print("\n=== HIGH VALUE ITEMS (price > $5000) ===")
for p in data:
    if p['price'] > 5000:
        print(f"  {p['property_type']:15} | ${p['price']:>10,} | {p['address'][:40]:40} | {p['notes'][:50]}")
