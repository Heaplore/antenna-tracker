#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build-kg-from-notes.py
======================

从 Obsidian 资料库「天线技术」目录抽取 4 类笔记,构建前端直接可用的知识图谱数据。

数据源:
  E:/我的知识库/我的知识库/资料库/天线技术/*.md

5 类 (按文件名前缀):
  技术概念-xxx.md   -> technology
  指标术语-xxx.md   -> metric
  零部件-xxx.md     -> component
  材料-xxx.md       -> material
  报告-xxx.md       -> report

输出:
  E:/OH-workspace/antenna-tracker/app/_data/knowledge-graph.json

数据结构 (前端 d3-force-friendly):
{
  "lastUpdate": "2026-07-04",
  "totalNotes": 137,
  "stats": {"technology": 67, "metric": 30, "component": 34, "material": 8},
  "nodes": [
    {
      "id": "tech-xxx-20260703",      # 稳定 ID = 类前缀 + slug(filename 去日期后缀)
      "name": "3GPP TR 38.901 信道模型",
      "nameEn": "3GPP TR 38.901 Channel Model",
      "type": "technology",
      "filename": "技术概念-3GPP TR38.901信道模型-20260703.md",
      "tags": ["3GPP信道模型", ...],
      "createdAt": "2026-07-03",
      "updatedAt": "2026-07-03",
      "oneLiner": "...",    # 来自「## 一句话版本」段
      "analogy": "...",     # 来自「## 类比入口」段首句
      "outgoing": [{"targetId": "...", "label": "关联"}]
      # 注: incoming 关系前端按链接方向自然生成, 不冗余存
    },
    ...
  ],
  "links": [
    {"source": "tech-xxx", "target": "tech-yyy", "type": "related"},
    ...
  ]
}

用法:
  python scripts/build-kg-from-notes.py             # 默认路径
"""

import os
import re
import json
import hashlib
from pathlib import Path
from datetime import datetime

# ===== 路径配置 =====
NOTES_DIR = Path(r"E:/我的知识库/我的知识库/资料库/天线技术")
OUTPUT_PATH = Path(r"E:/hermes/antenna-tracker/app/_data/knowledge-graph.json")

# 类型前缀 -> 类型英文 ID (前端常量)
TYPE_PREFIX_MAP = [
    ("技术概念-", "technology"),
    ("指标术语-", "metric"),
    ("零部件-",  "component"),
    ("材料-",    "material"),
    ("报告-",    "report"),
]

SKIP_FILES = {"README.md"}


# ===== 工具函数 =====

def slugify(text: str) -> str:
    """文件名去日期后缀 + 标准化 ID。
    例如 '技术概念-3GPP TR38.901信道模型-20260703.md' -> 'technology-3gpp-tr38-901-xindaomoxing'
    同一文件名不同日期的笔记 → 同一个 ID, 后跑覆盖前跑 (增量语义)
    """
    base = text
    # 去扩展名
    base = re.sub(r"\.md$", "", base, flags=re.IGNORECASE)
    # 去日期后缀 -YYYYMMDD / -YYYY-MM-DD 等
    base = re.sub(r"-\d{8}$", "", base)
    base = re.sub(r"-\d{4}-\d{2}-\d{2}$", "", base)
    # 去前缀 (如 '技术概念-')
    for prefix, _ in TYPE_PREFIX_MAP:
        if base.startswith(prefix):
            base = base[len(prefix):]
            break
    # 规范化: 转 ascii-friendly, 去标点
    base = re.sub(r"[\s\(\)（）【】\[\]/\",'\"]+", "-", base)
    base = re.sub(r"[、·。，,!?;:.]+", "", base)
    base = re.sub(r"-+", "-", base).strip("-").lower()
    return base


def parse_frontmatter(content: str) -> tuple[dict, str]:
    """极简 frontmatter 解析 (YAML 块顶端 --- 包裹)。
    返回 (fm_dict, body_without_fm)。
    """
    m = re.match(r"^---\s*\n(.+?)\n---\s*\n(.*)$", content, re.DOTALL)
    if not m:
        return {}, content
    fm_text, body = m.group(1), m.group(2)
    fm = {}
    cur_key = None
    for raw in fm_text.split("\n"):
        line = raw.rstrip()
        if not line.strip():
            continue
        # 列表项:  - value
        lm = re.match(r"^\s*-\s+(.+?)\s*$", line)
        if lm:
            v = lm.group(1).strip()
            if cur_key:
                if not isinstance(fm[cur_key], list):
                    fm[cur_key] = [fm[cur_key]] if fm[cur_key] else []
                fm[cur_key].append(v)
            continue
        # key: value
        km = re.match(r"^([^:]+?):\s*(.*)$", line)
        if km:
            key = km.group(1).strip()
            val = km.group(2).strip()
            cur_key = key
            if val:
                fm[key] = val
            else:
                fm[key] = ""
    return fm, body


def extract_section(body: str, section_name: str) -> str:
    """抽 ## <section_name> 段正文,直到下一个 ## 或文末。
    返回去掉 markdown 标记的纯文本 (单段字符串, 多行 join)。
    """
    # 匹配 ## 段标题 (允许 # / ## 等任意级, 但找第一个匹配)
    pattern = re.compile(
        rf"^#{{1,6}}\s*{re.escape(section_name)}\s*$\n(.*?)(?=^#{{1,6}}\s|\Z)",
        re.MULTILINE | re.DOTALL,
    )
    m = pattern.search(body)
    if not m:
        return ""
    raw = m.group(1).strip()
    return _strip_simple_md(raw)


def _strip_simple_md(raw: str) -> str:
    """简易 markdown 去标记 (用于一句话/类比/卡片首屏纯文本)。"""
    raw = re.sub(r"```[\s\S]*?```", "", raw)        # code block
    raw = re.sub(r"`([^`]+)`", r"\1", raw)            # inline code
    raw = re.sub(r"\*\*([^*]+)\*\*", r"\1", raw)     # bold
    raw = re.sub(r"\*([^*]+)\*", r"\1", raw)         # italic
    raw = re.sub(r"!?\[([^\]]+)\]\([^)]+\)", r"\1", raw)  # [text](url) -> text
    raw = re.sub(r"^#+\s*", "", raw, flags=re.MULTILINE)  # 段内再出现的标题
    raw = re.sub(r"^[-*+]\s*", "", raw, flags=re.MULTILINE)  # list bullets
    return raw.strip()


def extract_all_sections(body: str) -> list[dict]:
    """抽笔记里所有 ## / ### 段,返回 [{level, title, content, raw}] 列表。
    - level: 2 (##) 或 3 (###)
    - content: 纯文本 (无 markdown 标记)
    - raw: 原始 markdown 文本 (供前端渲染用)
    """
    sections = []
    lines = body.split("\n")
    cur = None
    buf: list[str] = []
    for line in lines:
        hm = re.match(r"^(#{2,6})\s+(.+?)\s*$", line)
        if hm:
            if cur is not None:
                raw = "\n".join(buf).strip()
                if raw:
                    sections.append({
                        "level": cur["level"],
                        "title": cur["title"],
                        "raw": raw,
                        "content": _strip_simple_md(raw),
                    })
            cur = {"level": len(hm.group(1)), "title": hm.group(2).strip()}
            buf = []
        else:
            buf.append(line)
    if cur is not None:
        raw = "\n".join(buf).strip()
        if raw:
            sections.append({
                "level": cur["level"],
                "title": cur["title"],
                "raw": raw,
                "content": _strip_simple_md(raw),
            })
    return sections


def extract_one_liner(body: str) -> str:
    """## 一句话版本 段 -> 单行摘要。"""
    s = extract_section(body, "一句话版本")
    if not s:
        return ""
    # 截断到第一段 (空行或中文句号)
    s = s.split("\n\n")[0].strip()
    # 取第一个非空行
    for ln in s.split("\n"):
        ln = ln.strip().lstrip("> ").strip()
        if ln:
            return ln
    return ""


def extract_analogy(body: str) -> str:
    """## 类比入口 段 -> 通俗版。"""
    s = extract_section(body, "类比入口")
    if not s:
        return ""
    # 取首句
    for ln in s.split("\n"):
        ln = ln.strip().lstrip("> ").strip()
        if ln:
            # 第一句 (到句号 / 问号 / 感叹号 / 换行)
            sm = re.match(r"^([^。！？?!？\n]+[。！？?!]?)\s*", ln)
            return sm.group(1) if sm else ln
    return ""


def extract_wikilinks(fm: dict, body: str) -> list[str]:
    """抽取 [[xxx]] wikilink 列表。"""
    raw = " ".join([
        " ".join(fm.get("关联", [])) if isinstance(fm.get("关联"), list) else (fm.get("关联") or ""),
        body,
    ])
    return re.findall(r"\[\[([^\]]+?)\]\]", raw)


def wikilink_to_filename(name: str) -> str:
    """obsidian wikilink 文本 -> 匹配笔记的 filename (带日期后缀)。
    wikilink 形式可能是 '技术概念-3GPP TR38.901信道模型' 或 '材料-Rogers系列高频板材'。
    实际文件名是 '技术概念-3GPP TR38.901信道模型-20260703.md'。
    用 name 在目录里做前缀匹配。
    """
    if not name:
        return ""
    # 直接精确匹配 (无日期)
    candidates = list(NOTES_DIR.glob(f"{name}.md"))
    if candidates:
        return candidates[0].name
    # 带日期后缀模式
    candidates = list(NOTES_DIR.glob(f"{name}-*.md"))
    if candidates:
        # 取最新日期
        return sorted(candidates, reverse=True)[0].name
    return ""


# ===== 主流程 =====

def main():
    if not NOTES_DIR.exists():
        raise FileNotFoundError(f"笔记目录不存在: {NOTES_DIR}")

    files = sorted([p.name for p in NOTES_DIR.glob("*.md")])
    files = [f for f in files if f not in SKIP_FILES]

    # 过滤: 只处理 4 类前缀
    notes = []
    for fname in files:
        for prefix, type_id in TYPE_PREFIX_MAP:
            if fname.startswith(prefix):
                notes.append((fname, type_id))
                break

    print(f"📖 扫描笔记: {len(files)} 个 md, 其中 {len(notes)} 个属于 4 类前缀")

    nodes = []
    name_to_id: dict[str, str] = {}      # filename -> node id
    raw_links: list[tuple[str, str]] = []  # (filename_a, filename_b)

    # ===== 第一遍: 构造 nodes =====
    for fname, type_id in notes:
        full_path = NOTES_DIR / fname
        try:
            content = full_path.read_text(encoding="utf-8")
        except Exception as e:
            print(f"  ❌ 读失败 {fname}: {e}")
            continue

        fm, body = parse_frontmatter(content)

        # ID 生成: <type>-<slug>, slug = 文件名去日期
        slug = slugify(fname)
        node_id = f"{type_id[0]}{type_id[1] if len(type_id)>1 else ''}-{slug}".replace("--", "-")
        # 上面的奇怪逻辑太绕, 直接写:
        node_id = f"{type_id}-{slug}"

        # 名字: 文件名主体去日期 + 去扩展
        raw_name = re.sub(r"\.md$", "", fname, flags=re.IGNORECASE)
        raw_name = re.sub(r"-\d{8}$", "", raw_name)
        for prefix, _ in TYPE_PREFIX_MAP:
            if raw_name.startswith(prefix):
                raw_name = raw_name[len(prefix):]
                break
        # 英文部分: 先尝试从标签提取
        name_en = ""
        m = re.search(r"[\(|（]([A-Za-z0-9\-\s\./]+)[\)|）]", fname)
        if m:
            name_en = m.group(1).strip()

        # 标签
        tags = []
        if isinstance(fm.get("标签"), str):
            tags = re.findall(r"[\[【]?([^,，\]】\s]+)[,，\]】\s]?", fm["标签"])
            tags = [t.strip() for t in tags if t.strip()]

        # 摘录
        one_liner = extract_one_liner(body)
        analogy = extract_analogy(body)

        # 全部段落 (留给卡片细节展开) - 只留非空段
        all_sections = extract_all_sections(body)

        node = {
            "id": node_id,
            "name": raw_name,
            "nameEn": name_en,
            "type": type_id,
            "filename": fname,
            "tags": tags,
            "createdAt": fm.get("创建日期", ""),
            "updatedAt": fm.get("更新日期", ""),
            "oneLiner": one_liner,
            "analogy": analogy,
            "sections": all_sections,  # [{level, title, raw, content}]
            "outgoing": [],   # 后续填充
        }
        nodes.append(node)
        name_to_id[fname] = node_id
        name_to_id[raw_name] = node_id  # 便于 wikilink 文本匹配

    # ===== 第二遍: 抽 wikilinks, 落 links =====
    link_set = set()
    edges = []

    def resolve_wikilink(link_text: str) -> str:
        """从 wikilink 文本 -> node id。如果解析不到, 返回空串。"""
        text = link_text.strip()
        # 1. 文件名直接命中 (罕见但有可能)
        if text in name_to_id:
            return name_to_id[text]
        # 2. 用 OBSIDIAN 文本作为文件名主体查找
        fname = wikilink_to_filename(text)
        if fname and fname in name_to_id:
            return name_to_id[fname]
        # 3. 模糊: type-prefix 简称 + 文件名主体
        #    例如 '材料-Rogers系列高频板材' -> 直接 hit
        return ""

    for fname, type_id in notes:
        full_path = NOTES_DIR / fname
        try:
            content = full_path.read_text(encoding="utf-8")
        except Exception:
            continue
        fm, body = parse_frontmatter(content)
        wikilinks = extract_wikilinks(fm, body)

        src_id = name_to_id.get(fname)
        if not src_id:
            continue

        for w in wikilinks:
            tgt_id = resolve_wikilink(w)
            if not tgt_id or tgt_id == src_id:
                continue
            edge = (src_id, tgt_id)
            if edge not in link_set:
                link_set.add(edge)
                edges.append({"source": src_id, "target": tgt_id, "type": "related"})
                # 记到 source 节点的 outgoing (前端抽屉显示)
                for n in nodes:
                    if n["id"] == src_id:
                        n["outgoing"].append({"targetId": tgt_id, "label": "关联"})
                        break

    # ===== 统计 =====
    stats = {"technology": 0, "metric": 0, "component": 0, "material": 0, "report": 0}
    for n in nodes:
        stats[n["type"]] += 1

    out = {
        "lastUpdate": datetime.now().strftime("%Y-%m-%d"),
        "totalNotes": len(nodes),
        "stats": stats,
        "nodes": nodes,
        "links": edges,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"💾 写入 {OUTPUT_PATH}")
    print(f"   nodes: {len(nodes)}, links: {len(edges)}")
    print(f"   stats: {stats}")


if __name__ == "__main__":
    main()
