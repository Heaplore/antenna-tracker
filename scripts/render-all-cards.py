#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""render-all-cards.py — 渲染全部节点类型的 KG 卡片（包括报告）。

对比原版 render-all-tech-cards.py 的差异：
- 原版只渲染 technology 类型
- 本脚本渲染全部 5 种类型（technology/metric/component/material/report）
- 使用同一模板 technology.html（所有类型通用布局）

用法:
    python scripts/render-all-cards.py
"""
import json
import re
import sys
from pathlib import Path

try:
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    import markdown
except ImportError:
    print("需要安装 jinja2 + markdown: pip install jinja2 markdown")
    sys.exit(1)

ROOT = Path(r"E:/hermes/antenna-tracker")
TEMPLATES_DIR = ROOT / "public/kg-cards/templates"
RENDERED_DIR = ROOT / "public/kg-cards-rendered"
KG_FILE = ROOT / "app/_data/knowledge-graph.json"

TYPE_LABELS = {
    "technology": "技术概念",
    "metric": "指标术语",
    "component": "零部件",
    "material": "材料",
    "report": "报告",
}


def md_to_html(md_text: str) -> str:
    if not md_text:
        return ""
    text = re.sub(r'```\n```\n', '```\n\n```\n\n', md_text)
    text = re.sub(r'([：:。！!])\n-', r'\1\n\n-', text)
    text = re.sub(r'([：:。！!])\n(\d+\.)', r'\1\n\n\2', text)
    text = re.sub(r'```\n\n- ', '```\n\n\n- ', text)
    return markdown.markdown(text, extensions=["tables", "fenced_code"])


def strip_markdown(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'__(.+?)__', r'\1', text)
    return text.strip()


def normalize_node(node: dict) -> dict:
    sections = []
    for s in node.get("sections", []):
        title = s.get("title", "")
        if "自检清单" in title or "TODO" in title or "Checklist" in title:
            continue
        sec = {"title": strip_markdown(title)}
        level = s.get("level", 2)
        raw = s.get("raw", "") or ""
        if level == 2 and len(raw.strip()) < 200:
            continue
        sec["type"] = "text"
        sec["content"] = md_to_html(raw.strip())
        sections.append(sec)

    related = []
    for o in node.get("outgoing", []):
        related.append(o.get("targetId", ""))

    return {
        "node_id": node["id"],
        "type": node.get("type", "technology"),
        "name": node.get("name", ""),
        "english_name": node.get("nameEn", ""),
        "updated": node.get("updatedAt", ""),
        "one_liner": node.get("oneLiner", ""),
        "analogy": node.get("analogy", ""),
        "tags": node.get("tags", []),
        "sections": sections,
        "related": related,
    }


def render_one(normalized: dict) -> Path:
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=select_autoescape(["html"]),
    )
    tmpl = env.get_template("technology.html")
    html = tmpl.render(**normalized)

    out = RENDERED_DIR / f"{normalized['node_id']}.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    return out


def main():
    RENDERED_DIR.mkdir(parents=True, exist_ok=True)

    kg = json.loads(KG_FILE.read_text(encoding="utf-8"))
    nodes = kg.get("nodes", [])

    success = 0
    skipped = 0
    for i, node in enumerate(nodes, 1):
        ntype = node.get("type", "technology")
        label = TYPE_LABELS.get(ntype, ntype)
        norm = normalize_node(node)

        try:
            out = render_one(norm)
            size_kb = out.stat().st_size // 1024
            print(f"  [{i}/{len(nodes)}] ✅ [{label}] {norm['name']} ({size_kb} KB)")
            success += 1
        except Exception as e:
            print(f"  [{i}/{len(nodes)}] ❌ [{label}] {norm['name']}: {e}")
            skipped += 1

    print(f"\n完成: {success}/{len(nodes)}, 跳过: {skipped}")


if __name__ == "__main__":
    main()
