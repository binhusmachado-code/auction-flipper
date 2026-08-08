import json

data = json.load(open('gsa_test2.json'))
for p in data:
    print(f"--- {p['id']} ---")
    print(f"Name: {p['notes']}")
    print(f"Addr: {p['address']}")
    print(f"Desc: {p['description'][:500]}")
    print()
