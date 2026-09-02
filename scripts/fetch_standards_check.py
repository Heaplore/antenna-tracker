#!/usr/bin/env python3
"""Fetch key standard pages to check for updates."""
import urllib.request
import ssl
import re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

urls = [
    ("3GPP R19", "https://www.3gpp.org/release-19"),
    ("3GPP R20", "https://www.3gpp.org/release-20"),
    ("3GPP R21", "https://www.3gpp.org/release-21"),
    ("IEEE 802", "https://www.ieee802.org/11/"),
    ("ITU IMT-2030", "https://www.itu.int/hub/2026/03/imt-2030-technical-requirements-for-the-6g-future/"),
]

for name, url in urls:
    print(f"\n{'='*60}")
    print(f"=== {name} ===")
    print(f"URL: {url}")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; CronBot/1.0)"})
        resp = urllib.request.urlopen(req, timeout=30, context=ctx)
        html = resp.read().decode("utf-8", errors="replace")
        # Strip tags, get text
        text = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL|re.IGNORECASE)
        text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL|re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text)
        print(text[:3000])
    except Exception as e:
        print(f"ERROR: {e}")
