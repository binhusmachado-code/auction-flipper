#!/usr/bin/env python3
import requests, os, time, json, sys

SUPABASE_URL = "https://weguwjxuvibbyqrrvqcw.supabase.co"
SUPABASE_KEY = "sb_publishable_JauuTENFT1-RfVMhL7FJPQ_VtSxzhGI"

url = f"{SUPABASE_URL}/rest/v1/properties"
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Prefer": "return=minimal",
}

# Try to delete all
print("Attempting DELETE...")
resp = requests.delete(url, headers=headers, timeout=30)
print(f"DELETE status: {resp.status_code}")
print(f"Response: {resp.text[:500]}")

# Check count after
time.sleep(1)
count_resp = requests.get(url, headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}, params={"select": "count"}, timeout=30)
print(f"Count check status: {count_resp.status_code}")
if count_resp.status_code == 200:
    data = count_resp.json()
    print(f"Remaining rows: {len(data)}")
