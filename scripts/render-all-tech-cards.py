#!/usr/bin/env python3
"""render-all-tech-cards.py — 从 knowledge-graph.json 批量渲染技术概念类 KG 卡片。

用法:
    python scripts/render-all-tech-cards.py          # 渲染全部 67 个
    python scripts/render-all-tech-cards.py --node technology-aau有源天线单元深度解读  # 只渲染一个
    python scripts/render-all-tech-cards.py --dry    # 预览不渲染
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
# 2026-07-08 fix: 输出目录应与 deploy 目录一致 (public/kg-cards-rendered/, 连字符)
# 原版是 public/kg-cards/rendered/ (嵌套), 会导致渲染的 HTML 不到 GH
RENDERED_DIR = ROOT / "public/kg-cards-rendered"
KG_FILE = ROOT / "app/_data/knowledge-graph.json"


def md_to_html(md_text: str) -> str:
    """将 Markdown 原文转为 HTML，保留所有格式。"""
    if not md_text:
        return ""
    # 预处理：在代码块结束符后加空行，确保列表能被正确识别
    # markdown 库要求列表前有空行分隔
    text = re.sub(r'```\n```\n', '```\n\n```\n\n', md_text)
    # 在段落和列表之间加空行
    text = re.sub(r'([：:。！!])\n-', r'\1\n\n-', text)
    text = re.sub(r'([：:。！!])\n(\d+\.)', r'\1\n\n\2', text)
    # 在代码块结束和列表之间加空行
    text = re.sub(r'```\n\n- ', '```\n\n\n- ', text)

    return markdown.markdown(
        text,
        extensions=["tables", "fenced_code"],
    )


def strip_markdown(text: str) -> str:
    """仅用于标题等元数据，剥离格式化标记。"""
    if not text:
        return ""
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'__(.+?)__', r'\1', text)
    text = text.strip()
    return text


def normalize_node(node: dict) -> dict:
    """把 KG JSON 节点映射成 technology.html 模板需要的字段。"""
    sections = []
    for s in node.get("sections", []):
        # 过滤掉 自检清单 等作者元数据
        title = s.get("title", "")
        if "自检清单" in title or "TODO" in title or "Checklist" in title:
            continue

        sec = {"title": strip_markdown(title)}
        level = s.get("level", 2)
        raw = s.get("raw", "") or ""

        # 跳过一级标题（"一、概述" 这种）
        if level == 2 and len(raw.strip()) < 200:
            continue

        # 所有 section 统一走 text 类型，raw 直接转 HTML
        sec["type"] = "text"
        sec["content"] = md_to_html(raw.strip())

        sections.append(sec)

    # 构建 related 列表
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

    # 加载 KG 数据
    kg = json.loads(KG_FILE.read_text(encoding="utf-8"))
    nodes = kg.get("nodes", [])

    # 过滤技术概念类
    tech_nodes = [n for n in nodes if n.get("type") == "technology"]

    # 支持 --node 参数
    if "--node" in sys.argv:
        idx = sys.argv.index("--node")
        if idx + 1 < len(sys.argv):
            target_id = sys.argv[idx + 1]
            tech_nodes = [n for n in tech_nodes if n["id"] == target_id]
            if not tech_nodes:
                print(f"❌ 未找到节点: {target_id}")
                sys.exit(1)

    # 支持 --dry 参数
    dry = "--dry" in sys.argv

    print(f"技术概念节点: {len(tech_nodes)} 个")
    if dry:
        print("(dry run，不写入文件)")

    success = 0
    for i, node in enumerate(tech_nodes, 1):
        norm = normalize_node(node)
        if dry:
            print(f"  [{i}/{len(tech_nodes)}] {norm['name']} → {norm['node_id']}.html")
            success += 1
            continue

        try:
            out = render_one(norm)
            size_kb = out.stat().st_size // 1024
            print(f"  [{i}/{len(tech_nodes)}] ✅ {norm['name']} ({size_kb} KB)")
            success += 1
        except Exception as e:
            print(f"  [{i}/{len(tech_nodes)}] ❌ {norm['name']}: {e}")

    print(f"\n完成: {success}/{len(tech_nodes)}")


if __name__ == "__main__":
    main()
