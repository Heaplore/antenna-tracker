#!/usr/bin/env python3
"""
更新 prices.json 中的金价数据。
从 SMM/金投网 抓取最新黄金价格。
纯 Python 标准库，无需 pip install。
"""
import json
import os
import re
import sys
import urllib.request
import urllib.error

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", "_data", "prices.json")


def fetch_html(url, timeout=15):
    """Fetch URL and return decoded text."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    }
    req = urllib.request.Request(url, headers=headers)
    ctx = None
    try:
        ctx = urllib.request.ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = urllib.request.ssl.CERT_NONE
    except Exception:
        pass
    try:
        resp = urllib.request.urlopen(req, timeout=timeout, context=ctx)
        raw = resp.read()
        # Auto-detect encoding
        for enc in ["utf-8", "gbk", "gb2312", "gb18030"]:
            try:
                return raw.decode(enc)
            except (UnicodeDecodeError, LookupError):
                continue
        return raw.decode("utf-8", errors="ignore")
    except urllib.error.HTTPError as e:
        print(f"  HTTP error {e.code} for {url}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  Fetch error for {url}: {e}", file=sys.stderr)
        return None


def extract_price_from_cngold():
    """
    从 中国黄金网 cngold.org 抓取当日国内金价（元/克）。
    主站: https://www.cngold.org
    备用: https://gold.cngold.org
    """
    urls = [
        "https://www.cngold.org",
        "https://gold.cngold.org",
    ]
    for url in urls:
        print(f"  Trying {url} ...")
        html = fetch_html(url)
        if not html:
            continue

        # 搜索价格模式: "XXX.XX" 或 "XXX,XXX" 格式
        # 国内金价通常在 850-1050 元/克 范围内（截至 2026）
        # 常见的价格展示格式：
        # <span class="current">985.32</span>
        # 或直接数字出现在页面上

        # Pattern 1: 找到包含 "元/克" 附近的数字
        # Look for price near "元/克" or "元／克"
        pattern = r'(\d{3,4}[,.]\d{1,3})\s*(?:元\s*/\s*克|元/克)'
        matches = re.findall(pattern, html)
        if matches:
            # 取最近的匹配
            for m in reversed(matches):
                # Normalize comma to dot
                clean = m.replace(",", ".")
                price = float(clean)
                # Sanity check: gold price should be in realistic range
                if 500 <= price <= 1200:
                    return price

        # Pattern 2: 查找所有价格数字，筛选合理范围内的
        all_prices = re.findall(r'\b(\d{3,4}\.\d{1,3})\b', html)
        for p in all_prices:
            price = float(p)
            if 850 <= price <= 1100:
                # Check if this price is near gold-related keywords
                idx = html.find(p)
                context = html[max(0, idx-100):idx+50].lower()
                if any(kw in context for kw in ["金", "gold", "金价", "au", "现货"]):
                    return price

    return None


def fetch_price_from_smma():
    """
    备选：从 SMM (上海有色网) 抓取金价。
    """
    html = fetch_html("https://www.smm.cn/goods/info/gold.htm")
    if not html:
        return None

    # 搜索价格模式
    pattern = r'(\d{3,4}[.,]\d{1,3})'
    matches = re.findall(pattern, html)
    for m in reversed(matches):
        clean = m.replace(",", ".").replace(",", ".")
        try:
            price = float(clean)
            if 500 <= price <= 1200:
                return price
        except ValueError:
            continue
    return None


def update_prices_json(new_gold_price, today_str):
    """Update gold price in prices.json."""
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Find the gold category (metal raw materials, index 0)
    # Category 0 = 金属原材料
    # Material 3 = 金 (0-indexed: copper=0, aluminum=1, stainless=2, gold=3)
    cat_idx = 0
    gold_idx = None
    for i, mat in enumerate(data["categories"][cat_idx]["materials"]):
        if mat["name"] == "金":
            gold_idx = i
            break

    if gold_idx is None:
        print("ERROR: Gold material not found!", file=sys.stderr)
        return False

    old_price = data["categories"][cat_idx]["materials"][gold_idx]["currentPrice"]
    old_hist = data["categories"][cat_idx]["materials"][gold_idx].get("historical", [])

    # Update current price
    data["categories"][cat_idx]["materials"][gold_idx]["currentPrice"] = round(new_gold_price, 2)
    data["categories"][cat_idx]["materials"][gold_idx]["date"] = today_str
    data["categories"][cat_idx]["materials"][gold_idx]["change"] = "0.0%"

    # Update historical data: replace last entry (2026-07) with new price
    # If 2026-07 exists, update it; otherwise append
    new_hist_entry = {"month": "2026-07", "price": round(new_gold_price, 2)}
    updated = False
    for i, entry in enumerate(old_hist):
        if entry["month"] == "2026-07":
            old_hist[i] = new_hist_entry
            updated = True
            break
    if not updated:
        old_hist.append(new_hist_entry)

    data["categories"][cat_idx]["materials"][gold_idx]["historical"] = old_hist
    data["lastUpdate"] = today_str

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"  Updated gold price: {old_price} -> {new_gold_price} 元/克")
    return True


def main():
    print("Fetching latest gold price from cngold.org ...")
    price = extract_price_from_cngold()
    if price is None:
        print("  Trying SMM fallback ...")
        price = fetch_price_from_smma()

    if price is None:
        print("ERROR: Could not fetch gold price from any source!", file=sys.stderr)
        print("Manually update prices.json or fix the fetch logic.", file=sys.stderr)
        sys.exit(1)

    print(f"  Got gold price: {price} 元/克")

    # Get today's date
    from datetime import datetime
    today = datetime.now().strftime("%Y-%m-%d")

    if update_prices_json(price, today):
        print("Done! prices.json updated.")
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
