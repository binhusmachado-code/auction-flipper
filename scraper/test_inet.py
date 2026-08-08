#!/usr/bin/env python3
import urllib.request
req = urllib.request.Request("https://httpbin.org/get", headers={"User-Agent": "test"})
resp = urllib.request.urlopen(req, timeout=10)
print("Status:", resp.status)
