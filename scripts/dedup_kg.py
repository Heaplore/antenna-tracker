#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""dedup_kg.py — 去重 knowledge-graph.json 中的重复节点（按node_id，保留最新日期）。

触发：build-kg-from-notes.py 生成 KG 后运行，修复同名笔记不同日期导致的重复ID问题。

用法:
    python scripts/dedup_kg.py
"""
import json
import re
from pathlib import Path
from collections import defaultdict

KG_PATH = Path(r"E:/hermes/antenna-tracker/app/_data/knowledge-graph.json")
DATA = json.loads(KG_PATH.read_text(encoding="utf-8"))

nodes = DATA["nodes"]
print(f"Before dedup: {len(nodes)} nodes")

# Group by node_id
id_groups = defaultdict(list)
for n in nodes:
    id_groups[n["id"]].append(n)

deduped_nodes = []
for node_id, group in id_groups.items():
    if len(group) == 1:
        deduped_nodes.append(group[0])
    else:
        def get_date(node):
            fname = node["filename"]
            m = re.search(r'(\d{8})\.md$', fname)
            return m.group(1) if m else "00000000"
        group.sort(key=get_date, reverse=True)
        winner = group[0]
        dupes = group[1:]
        print(f"  🔁 {node_id}: keeping {winner['filename'].split('/')[-1]}, dropping {[d['filename'].split('/')[-1] for d in dupes]}")
        deduped_nodes.append(winner)

DATA["nodes"] = deduped_nodes

# Update stats
stats = {"technology": 0, "metric": 0, "component": 0, "material": 0, "report": 0}
for n in deduped_nodes:
    stats[n["type"]] += 1
DATA["stats"] = stats
DATA["totalNotes"] = len(deduped_nodes)

KG_PATH.write_text(json.dumps(DATA, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\n✅ Deduplicated: {len(nodes)} -> {len(deduped_nodes)} nodes")
print(f"   stats: {stats}")
