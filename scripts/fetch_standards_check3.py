#!/usr/bin/env python3
"""Check 3GPP work plan and RAN meeting results for latest status."""
import urllib.request
import ssl
import re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

urls = [
    ("3GPP Work Plan", "https://www.3gpp.org/work-plan"),
    ("3GPP News", "https://www.3gpp.org/news"),
    ("ITU M.2160 full page", "https://www.itu.int/en/itu-r/environment/Pages/imt-2030.aspx"),
]

for name, url in urls:
    print(f"\n{'='*60}")
    print(f"=== {name} ===")
    print(f"URL: {url}")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        resp = urllib.request.urlopen(req, timeout=30, context=ctx)
        html = resp.read().decode("utf-8", errors="replace")
        text = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL|re.IGNORECASE)
        text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL|re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"&[a-z]+;", " ", text)
        text = re.sub(r"\s+", " ", text)
        print(text[:4000])
    except Exception as e:
        print(f"ERROR: {e}")
