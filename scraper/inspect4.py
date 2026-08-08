import json

data = json.load(open('gsa_all.json'))

# Look at specific high-value items
for p in data:
    if p['price'] > 10000:
        print(f"--- {p['id']} ---")
        print(f"  Type: {p['property_type']}")
        print(f"  Price: ${p['price']:,}")
        print(f"  Address: {p['address']}")
        print(f"  Notes: {p['notes']}")
        print(f"  Desc: {p['description'][:400]}")
        print()
