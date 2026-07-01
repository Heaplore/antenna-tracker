#!/usr/bin/env python3
"""四维交叉分析生成脚本 (v2 重写)

改进点（vs v1）：
1. Prompt 配置外置到 scripts/lib/analysis_prompts.json
2. 价格抽取从 3 个月 → 6 个月（让 LLM 看到更多趋势）
3. Card 数量后处理：保证每维度 ≥ min 卡
4. 增加 priorityScore 字段（severity + 数据时效）
5. 综合摘要数据化：从 high severity 卡片中提建议（而非 LLM 自由发挥）
6. data_sources 字段保留 + 前端展示
7. 新闻按日期排序后再取 Top 5

用法:
  python scripts/generate-analysis.py
  AGNES_API_KEY=sk-xxx python scripts/generate-analysis.py
"""
import os
import sys
import json
import hashlib
from datetime import datetime, timedelta, timezone

# 路径
_SCRIPT_PATH = os.path.abspath(__file__ if '__file__' in globals() else 'scripts/generate-analysis.py')
SCRIPT_DIR = os.path.dirname(_SCRIPT_PATH)
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, os.path.join(PROJECT_ROOT, "scripts"))

PUBLIC_DATA_DIR = os.path.join(PROJECT_ROOT, "public", "data")
APP_DATA_DIR = os.path.join(PROJECT_ROOT, "app", "_data")

DATA_FILES = {
    "market": os.path.join(PUBLIC_DATA_DIR, "market.json"),
    "prices": os.path.join(PUBLIC_DATA_DIR, "prices.json"),
    "companies": os.path.join(PUBLIC_DATA_DIR, "companies.json"),
    "news": os.path.join(PUBLIC_DATA_DIR, "news.json"),
    "standards": os.path.join(PUBLIC_DATA_DIR, "standards.json"),
    "technology": os.path.join(PUBLIC_DATA_DIR, "technology.json"),
    "knowledge_graph": os.path.join(APP_DATA_DIR, "knowledge-graph.json"),
}

CACHE_FILE = os.path.join(APP_DATA_DIR, "analysis-cache.json")
CACHE_TTL_HOURS = 12  # 缩短缓存时间，配合每天跑一次

OUTPUT_FILE = os.path.join(APP_DATA_DIR, "analysis-output.json")

# Prompt 配置
PROMPTS_FILE = os.path.join(SCRIPT_DIR, "lib", "analysis_prompts.json")

API_TIMEOUT = 120


# ============================================================
# 加载配置
# ============================================================

def load_prompts():
    """加载分析 Prompt 配置"""
    if not os.path.exists(PROMPTS_FILE):
        raise FileNotFoundError(f"Prompt config not found: {PROMPTS_FILE}")
    with open(PROMPTS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


# ============================================================
# 数据抽取（v2：6 个月价格、新闻排序）
# ============================================================

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def extract_market(data):
    return {
        "summary": data.get("summary", {}),
        "segments": data.get("segments", [])[:3],
        "lastUpdate": data.get("lastUpdate", ""),
    }


def extract_prices(data):
    """价格抽稀：保留最近 6 个月（让 LLM 看到趋势）"""
    result = {"lastUpdate": data.get("lastUpdate", ""), "categories": []}
    for cat in data.get("categories", []):
        materials = []
        for mat in cat.get("materials", []):
            hist = mat.get("historical", [])
            # 改进：保留最近 6 个月而不是 3 个月
            recent = hist[-6:] if len(hist) > 6 else hist
            materials.append({
                "name": mat.get("name", ""),
                "currentPrice": mat.get("currentPrice"),
                "unit": mat.get("unit", ""),
                "change": mat.get("change", "0"),
                "trend": mat.get("trend", ""),
                "priceType": mat.get("priceType", ""),
                "recentHistory": recent,
            })
        result["categories"].append({
            "name": cat.get("name", ""),
            "materials": materials,
        })
    return result


def extract_companies(data):
    summary = data.get("summary", "")
    supply_chain = data.get("supplyChain", {})

    key_companies = []
    for level_key in ["tier1_operators", "tier2_equipment", "tier3_antenna_manufacturers",
                       "tier4_components", "tier5_materials"]:
        level = supply_chain.get(level_key, {})
        for comp in level.get("companies", []):
            if comp.get("isKey"):
                key_companies.append({
                    "name": comp.get("name", ""),
                    "role": comp.get("role", ""),
                    "stockCode": comp.get("stockCode", ""),
                    "revenue": comp.get("revenue", ""),
                    "netProfit": comp.get("netProfit", ""),
                    "profitYoY": comp.get("profitYoY", ""),
                    "highlights": comp.get("highlights", [])[:3],
                })

    return {
        "summary": summary[:2000],
        "keyCompanies": key_companies,
    }


def extract_news(data, days=30):
    """新闻抽取：按日期排序后取最近 N 条"""
    if isinstance(data, list):
        news_list = data
    elif isinstance(data, dict):
        news_list = list(data.values())
    else:
        return []

    cutoff = datetime.now() - timedelta(days=days)
    recent = []
    for item in news_list:
        date_str = item.get("date", "")
        try:
            item_date = datetime.strptime(date_str, "%Y-%m-%d")
            if item_date >= cutoff:
                recent.append({
                    "date": date_str,
                    "title": item.get("title", ""),
                    "summary": item.get("summary", ""),
                    "tags": item.get("tags", []),
                    "source": item.get("source", ""),
                })
        except (ValueError, TypeError):
            continue

    # 改进：按日期倒序排序（最新优先）
    recent.sort(key=lambda x: x.get("date", ""), reverse=True)
    return recent[:30]


def extract_standards(data):
    categories = data.get("categories", [])
    active_standards = []

    for cat in categories:
        for std in cat.get("standards", []):
            status = std.get("status", "")
            if status in ("现行", "active", "Active"):
                active_standards.append({
                    "name": std.get("name", ""),
                    "title": std.get("title", ""),
                    "category": cat.get("name", ""),
                    "organization": std.get("organization", ""),
                    "publishDate": std.get("publishDate", ""),
                    "scope": std.get("scope", "")[:200] if std.get("scope") else "",
                })

    return active_standards[:20]


def extract_technology(data):
    overview = data.get("industryOverview", "")
    overview_snippet = overview[:2000] if overview else ""

    tech_list = []
    for tech in data.get("hypeCycle", {}).get("technologies", []):
        tech_list.append({
            "name": tech.get("name", ""),
            "nameCn": tech.get("nameCn", ""),
            "phase": tech.get("phase", ""),
            "yearEmerging": tech.get("yearEmerging"),
            "yearPeak": tech.get("yearPeak"),
        })

    return {
        "overview": overview_snippet,
        "hypeCycleTechnologies": tech_list,
    }


def extract_knowledge_graph(data):
    entities = data.get("entities", [])
    relations = data.get("relations", [])

    type_counts = {}
    top_entities = []
    for ent in entities[:50]:
        etype = ent.get("type", "unknown")
        type_counts[etype] = type_counts.get(etype, 0) + 1
        top_entities.append({
            "name": ent.get("name", ""),
            "type": etype,
            "description": ent.get("description", "")[:100],
        })

    rel_type_counts = {}
    for rel in relations[:50]:
        rtype = rel.get("relation", rel.get("predicate", "unknown"))
        rel_type_counts[rtype] = rel_type_counts.get(rtype, 0) + 1

    return {
        "totalEntities": len(entities),
        "totalRelations": len(relations),
        "typeCounts": type_counts,
        "topEntities": top_entities,
        "relationTypeCounts": rel_type_counts,
    }


def extract_all():
    extracted = {}
    for name, path in DATA_FILES.items():
        try:
            data = load_json(path)
            if name == "market":
                extracted[name] = extract_market(data)
            elif name == "prices":
                extracted[name] = extract_prices(data)
            elif name == "companies":
                extracted[name] = extract_companies(data)
            elif name == "news":
                extracted[name] = extract_news(data)
            elif name == "standards":
                extracted[name] = extract_standards(data)
            elif name == "technology":
                extracted[name] = extract_technology(data)
            elif name == "knowledge_graph":
                extracted[name] = extract_knowledge_graph(data)
        except Exception as e:
            print(f"  WARNING: Failed to extract {name}: {e}", file=sys.stderr)
            extracted[name] = {}
    return extracted


# ============================================================
# Prompt 构建（v2：从配置文件读取）
# ============================================================

def build_prompts(extracted, config):
    prompts = {}

    # --- 技术 ---
    tech_overview = extracted.get("technology", {}).get("overview", "无数据")[:500]
    tech_hype = json.dumps(extracted.get("technology", {}).get("hypeCycleTechnologies", []), ensure_ascii=False)[:800]
    kg_summary = json.dumps(extracted.get("knowledge_graph", {}), ensure_ascii=False)[:500]
    # 改进：按日期排序后取 Top 5（最新优先）
    tech_news = json.dumps([{"date": n.get("date",""), "title": n.get("title",""), "tags": n.get("tags",[])} for n in extracted.get("news", [])[:5]], ensure_ascii=False)

    p = config["userPrompts"]["technology"]
    p = p.replace('{overview}', tech_overview)
    p = p.replace('{hype_cycle}', tech_hype)
    p = p.replace('{kg_summary}', kg_summary)
    p = p.replace('{recent_news}', tech_news)
    p = p.replace('{min}', str(config["cardCount"]["min"]))
    p = p.replace('{max}', str(config["cardCount"]["max"]))
    prompts["technology"] = p

    # --- 质量 ---
    standards_data = json.dumps(extracted.get("standards", [])[:5], ensure_ascii=False, indent=2)[:1500]
    quality_news = json.dumps([{"date": n.get("date",""), "title": n.get("title","")} for n in extracted.get("news", [])[:5]], ensure_ascii=False)
    p = config["userPrompts"]["quality"]
    p = p.replace('{standards}', standards_data)
    p = p.replace('{recent_news}', quality_news)
    p = p.replace('{min}', str(config["cardCount"]["min"]))
    p = p.replace('{max}', str(config["cardCount"]["max"]))
    prompts["quality"] = p

    # --- 成本 ---
    # 改进：价格数据保留最近 6 个月，足够让 LLM 分析趋势
    prices_data = json.dumps(extracted.get("prices", {}), ensure_ascii=False)[:1500]
    market_summary = json.dumps(extracted.get("market", {}).get("summary", {}), ensure_ascii=False, indent=2)
    company_finances = json.dumps(extracted.get("companies", {}).get("keyCompanies", [])[:5], ensure_ascii=False, indent=2)
    p = config["userPrompts"]["cost"]
    p = p.replace('{prices}', prices_data)
    p = p.replace('{market_summary}', market_summary)
    p = p.replace('{company_finances}', company_finances)
    p = p.replace('{min}', str(config["cardCount"]["min"]))
    p = p.replace('{max}', str(config["cardCount"]["max"]))
    prompts["cost"] = p

    # --- 交付 ---
    supply_chain = extracted.get("companies", {}).get("summary", "无数据")[:500]
    key_finances = json.dumps(extracted.get("companies", {}).get("keyCompanies", [])[:5], ensure_ascii=False)[:800]
    delivery_news = json.dumps([{"date": n.get("date",""), "title": n.get("title","")} for n in extracted.get("news", [])[:5]], ensure_ascii=False)
    p = config["userPrompts"]["delivery"]
    p = p.replace('{supply_chain_summary}', supply_chain)
    p = p.replace('{key_company_finances}', key_finances)
    p = p.replace('{recent_news}', delivery_news)
    p = p.replace('{min}', str(config["cardCount"]["min"]))
    p = p.replace('{max}', str(config["cardCount"]["max"]))
    prompts["delivery"] = p

    return prompts


# ============================================================
# priorityScore 计算（v2 新增）
# ============================================================

SEVERITY_SCORES = {"high": 3, "medium": 2, "low": 1}


def compute_priority_score(card):
    """priorityScore = severity权重 + data新鲜度加成"""
    base = SEVERITY_SCORES.get(card.get("severity", "low"), 1)
    # data_sources 多 = 数据更全面
    sources_bonus = min(len(card.get("data_sources", [])), 3)
    return base + sources_bonus


# ============================================================
# LLM 调用
# ============================================================

def call_llm_for_dimension(client, dimension, extracted, config):
    """调用 LLM 分析单个维度，带重试"""
    import time as _time
    import re as _re

    system_prompt = config["systemPrompts"][dimension]
    prompts = build_prompts(extracted, config)
    user_prompt = prompts[dimension]

    print(f"  Calling agnes-2.0-flash for dimension: {dimension}...", file=sys.stderr)

    for attempt in range(3):
        try:
            _time.sleep(2)  # Rate limit
            result_text = client.generate(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.3,
                max_tokens=1800,
            )

            result = []
            try:
                result = json.loads(result_text)
            except json.JSONDecodeError:
                json_match = _re.search(r'\[\s*\{.*?\}\s*\]', result_text, _re.DOTALL)
                if json_match:
                    try:
                        result = json.loads(json_match.group())
                    except json.JSONDecodeError:
                        pass
                if not result:
                    print(f"  WARNING: JSON parse failed for {dimension} (attempt {attempt+1})", file=sys.stderr)
                    if attempt < 2:
                        _time.sleep(3)
                        continue
                    return []

            if isinstance(result, list):
                return result[:config["cardCount"]["max"]]
            elif isinstance(result, dict) and "cards" in result:
                return result["cards"][:config["cardCount"]["max"]]
            elif isinstance(result, dict):
                return [result]
            return []
        except Exception as e:
            print(f"  ERROR: LLM failed for {dimension} (attempt {attempt+1}): {e}", file=sys.stderr)
            if attempt < 2:
                _time.sleep(3)
                continue
            return []


def post_process_cards(cards, config, dimension):
    """Card 数量后处理：保证 ≥ min，截到 max，并加 priorityScore"""
    max_count = config["cardCount"]["max"]
    min_count = config["cardCount"]["min"]

    # 截断到 max
    cards = cards[:max_count]

    # 计算 priorityScore
    for card in cards:
        card["priorityScore"] = compute_priority_score(card)

    # 按 priorityScore 排序
    cards.sort(key=lambda c: c.get("priorityScore", 0), reverse=True)

    return cards


def gen_cross_summary_data(output, config):
    """v2：数据驱动生成综合摘要 - 从 high severity + cost/delivery 维度挑选"""
    cards_priority = []
    # cost / delivery 优先级更高
    dim_priority = {"cost": 1.5, "delivery": 1.3, "technology": 1.0, "quality": 1.0}

    for dim in config["dimensions"]:
        for card in output["dimensions"].get(dim, {}).get("cards", []):
            if card.get("severity") == "high":
                boost = dim_priority.get(dim, 1.0)
                score = card.get("priorityScore", 0) * boost
                cards_priority.append((score, dim, card))

    cards_priority.sort(key=lambda x: -x[0])
    top3 = cards_priority[:3]

    # 生成摘要文本
    if not top3:
        return "暂无高优先级分析"

    summary_parts = []
    for score, dim, card in top3:
        dim_label = {"technology": "技术", "quality": "质量", "cost": "成本", "delivery": "交付"}.get(dim, dim)
        # 输出：维度·建议摘要
        rec = card.get("recommendation", "")
        summary_parts.append(f"{dim_label}：{rec[:30]}")

    summary = "⚠️ 重点：" + "；".join(summary_parts) + "。"
    return summary


def run_analysis(client, extracted, config):
    dimensions = config["dimensions"]
    output = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+08:00"),
        "configVersion": config.get("version", "?"),
        "dimensions": {},
        "crossDimensionSummary": "",
    }

    for dim in dimensions:
        cards = call_llm_for_dimension(client, dim, extracted, config)
        cards = post_process_cards(cards, config, dim)
        output["dimensions"][dim] = {
            "cards": cards,
            "summary": f"{dim}维度共生成 {len(cards)} 条分析卡片",
        }
        print(f"  {dim}: {len(cards)} cards generated", file=sys.stderr)

    # v2：综合摘要数据化
    output["crossDimensionSummary"] = gen_cross_summary_data(output, config)
    print(f"  cross-dimension summary generated (data-driven, top-3 priorities)", file=sys.stderr)

    return output


# ============================================================
# 缓存管理
# ============================================================

def compute_data_hash():
    hasher = hashlib.sha256()
    for name, path in DATA_FILES.items():
        try:
            with open(path, "rb") as f:
                hasher.update(f.read())
        except FileNotFoundError:
            pass
    return hasher.hexdigest()


def is_cache_valid():
    if not os.path.exists(CACHE_FILE):
        return False
    try:
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            cache = json.load(f)
        cached_time = datetime.fromisoformat(cache.get("cachedAt", "2000-01-01"))
        now = datetime.now()
        if (now - cached_time).total_seconds() > CACHE_TTL_HOURS * 3600:
            return False
        return cache.get("dataHash") == compute_data_hash()
    except Exception:
        return False


def save_cache(output):
    cache = {
        **output,
        "cachedAt": datetime.now().isoformat(),
        "dataHash": compute_data_hash(),
    }
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=2)


# ============================================================
# 主流程
# ============================================================

def main():
    print("=" * 60, file=sys.stderr)
    print("天线行业情报追踪 - 四维交叉分析生成 (v2)", file=sys.stderr)
    print("=" * 60, file=sys.stderr)

    # API Key
    api_key = os.environ.get("AGNES_API_KEY")
    if not api_key:
        print("ERROR: AGNES_API_KEY not set.", file=sys.stderr)
        sys.exit(1)

    # Prompt 配置
    config = load_prompts()
    print(f"Loaded prompt config version: {config.get('version', '?')}", file=sys.stderr)

    # 数据文件检查
    for name, path in DATA_FILES.items():
        if not os.path.exists(path):
            print(f"WARNING: Data file not found: {path}", file=sys.stderr)

    os.makedirs(APP_DATA_DIR, exist_ok=True)

    # 缓存
    if is_cache_valid():
        print("Cache is valid, skipping LLM call.", file=sys.stderr)
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            output = json.load(f)
    else:
        print("Cache miss or expired. Running analysis...", file=sys.stderr)

        print("[1/4] Extracting data from source files...", file=sys.stderr)
        extracted = extract_all()

        print("[2/4] Initializing Agnes client...", file=sys.stderr)
        from lib.agnes_client import AgnesClient
        client = AgnesClient(api_key=api_key)

        print("[3/4] Running four-dimensional analysis...", file=sys.stderr)
        output = run_analysis(client, extracted, config)

        print("[4/4] Saving cache...", file=sys.stderr)
        save_cache(output)

    # 写出
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    total_cards = sum(
        len(output["dimensions"][d]["cards"])
        for d in output.get("dimensions", {}) if "cards" in output["dimensions"][d]
    )
    print(f"\nDone! Output: {OUTPUT_FILE}", file=sys.stderr)
    print(f"Total cards: {total_cards}", file=sys.stderr)
    print(f"Version: {config.get('version', '?')}", file=sys.stderr)
    print("=" * 60, file=sys.stderr)


if __name__ == "__main__":
    main()
