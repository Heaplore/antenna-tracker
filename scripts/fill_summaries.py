#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fill_summaries.py
=================
给 news.json 中 summary == title 或空的条目补全摘要。
策略：从新闻 URL 抓取正文，提取前 100 字作为摘要。
纯 Python 标准库，不调用任何外部 API。
"""
import json
import re
import urllib.request
import html
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "app" / "_data"
NEWS_JSON = DATA_DIR / "news.json"


def fetch_url_text(url: str, timeout: int = 10) -> str:
    """Fetch URL and extract visible text."""
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; AntennaBot/1.0)"
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        resp = urllib.request.urlopen(req, timeout=timeout, context=__ctx)
        raw = resp.read()
        # Try common encodings
        for enc in ["utf-8", "gbk", "gb2312", "gb18030"]:
            try:
                text = raw.decode(enc)
                break
            except (UnicodeDecodeError, LookupError):
                continue
        else:
            text = raw.decode("utf-8", errors="replace")
        # Strip HTML tags
        text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.S)
        text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.S)
        text = re.sub(r"<br\s*/?>", "\n", text)
        text = re.sub(r"</p>", "\n", text)
        text = re.sub(r"<[^>]+>", "", text)
        text = html.unescape(text)
        # Clean whitespace
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        # Extract first meaningful paragraph
        for para in text.split("\n"):
            para = para.strip()
            if len(para) > 30:
                return para[:500]
        return ""
    except Exception:
        return ""


# OpenSSL context to skip cert verification for domestic sites
try:
    import ssl
    __ctx = ssl.create_default_context()
    __ctx.check_hostname = False
    __ctx.verify_mode = ssl.CERT_NONE
except Exception:
    __ctx = None


def main():
    news = json.loads(NEWS_JSON.read_text(encoding="utf-8"))
    if isinstance(news, dict):
        news = list(news.values())
    elif not isinstance(news, list):
        print("ERROR: news.json is not a list or dict")
        return

    need_fix = []
    for item in news:
        summary = item.get("summary", "").strip()
        title = item.get("title", "").strip()
        if not summary or summary == title or len(summary) <= len(title) * 0.5:
            need_fix.append(item)

    print(f"Total: {len(news)}, Need fix: {len(need_fix)}")

    fixed = 0
    for i, item in enumerate(need_fix):
        url = item.get("url", "")
        if not url:
            continue
        print(f"[{i+1}/{len(need_fix)}] {item['title'][:50]}...")
        text = fetch_url_text(url)
        if text:
            item["summary"] = text
            fixed += 1
            print(f"  -> summary: {text[:80]}")
        else:
            print(f"  -> FAILED to fetch from {url}")
        
        # Rate limit
        import time
        time.sleep(0.5)

    NEWS_JSON.write_text(json.dumps(news, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nDone! Fixed {fixed}/{len(need_fix)} items.")


if __name__ == "__main__":
    main()
