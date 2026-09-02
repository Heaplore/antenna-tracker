#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
kg_daily_incremental.py
========================

每日增量上传：读取天线技术 vault 的 README.md，找出「⏳ 待上传」笔记，
按 technology.html 模板把它们转为知识图谱卡片，增量并入 knowledge-graph.json，
只渲染这少数新卡片（绝不整体重渲已部署卡片），推送 GitHub Pages，并回写 README 状态。

【铁律】只新增，不重渲。手工修复只存在于 public/kg-cards-rendered/*.html 渲染后产物，
整体重渲会把已修好的卡片覆盖回"干净源"。所以本脚本：
  1. 只把待上传笔记对应的节点 splice 进 knowledge-graph.json（节点+links）。
  2. 只渲染本次新增的卡片到 public/kg-cards-rendered/<node_id>.html。
  3. git push 只 add 变更的 KG json + 新卡片。

用法:
  python scripts/kg_daily_incremental.py --dry-run   # 只打印计划, 不改任何文件
  python scripts/kg_daily_incremental.py --apply     # 真正执行增量上传并推送

依赖: jinja2, markdown (若无会自动 pip install 到当前 python)
"""

import os
import re
import sys
import json
import argparse
import subprocess
import datetime
from pathlib import Path

try:
    import winreg
except ImportError:
    winreg = None  # 非 Windows 环境下无此模块，代理检测自动降级为直连

# ===================== 路径配置 =====================
REPO = Path(r"E:/hermes/antenna-tracker")
VAULT = Path(r"E:\我的知识库\我的知识库\资料库\天线技术")
KG_FILE = REPO / "app" / "_data" / "knowledge-graph.json"
TEMPLATES_DIR = REPO / "public" / "kg-cards" / "templates"
RENDERED_DIR = REPO / "public" / "kg-cards-rendered"
README = VAULT / "README.md"

BRANCH = "main"
REMOTE = "origin"

TYPE_PREFIX_MAP = [
    ("技术概念-", "technology"),
    ("指标术语-", "metric"),
    ("零部件-", "component"),
    ("材料-", "material"),
    ("报告-", "report"),
]
SKIP_FILES = {"README.md"}


# ===================== 依赖自举 =====================
def ensure_deps():
    try:
        import jinja2  # noqa
        import markdown  # noqa
    except ImportError:
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "--quiet", "jinja2", "markdown"],
            check=False,
        )


# ===================== 复用 build-kg-from-notes.py 的解析函数 =====================
def slugify(text: str) -> str:
    base = text
    base = re.sub(r"\.md$", "", base, flags=re.IGNORECASE)
    base = re.sub(r"-\d{8}$", "", base)
    base = re.sub(r"-\d{4}-\d{2}-\d{2}$", "", base)
    for prefix, _ in TYPE_PREFIX_MAP:
        if base.startswith(prefix):
            base = base[len(prefix):]
            break
    base = re.sub(r'[\s\(\)（）【】\[\]/,，\'"\"]+', "-", base)
    base = re.sub(r"[、·。，,!?;:.]+", "", base)
    base = re.sub(r"-+", "-", base).strip("-").lower()
    return base


def parse_frontmatter(content: str):
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
        lm = re.match(r"^\s*-\s+(.+?)\s*$", line)
        if lm:
            v = lm.group(1).strip()
            if cur_key:
                if not isinstance(fm[cur_key], list):
                    fm[cur_key] = [fm[cur_key]] if fm[cur_key] else []
                fm[cur_key].append(v)
            continue
        km = re.match(r"^([^:]+?):\s*(.*)$", line)
        if km:
            key = km.group(1).strip()
            val = km.group(2).strip()
            cur_key = key
            fm[key] = val if val else ""
    return fm, body


def _strip_simple_md(raw: str) -> str:
    raw = re.sub(r"```[\s\S]*?```", "", raw)
    raw = re.sub(r"`([^`]+)`", r"\1", raw)
    raw = re.sub(r"\*\*([^*]+)\*\*", r"\1", raw)
    raw = re.sub(r"\*([^*]+)\*", r"\1", raw)
    raw = re.sub(r"!?\[([^\]]+)\]\([^)]+\)", r"\1", raw)
    raw = re.sub(r"^#+\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"^[-*+]\s*", "", raw, flags=re.MULTILINE)
    return raw.strip()


def extract_all_sections(body: str):
    sections = []
    lines = body.split("\n")
    cur = None
    buf = []
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


def extract_one_liner(body: str):
    s = extract_section(body, "一句话版本")
    if not s:
        return ""
    s = s.split("\n\n")[0].strip()
    for ln in s.split("\n"):
        ln = ln.strip().lstrip("> ").strip()
        if ln:
            return ln
    return ""


def extract_section(body: str, section_name: str):
    pattern = re.compile(
        rf"^#{{1,6}}\s*{re.escape(section_name)}\s*$\n(.*?)(?=^#{{1,6}}\s|\Z)",
        re.MULTILINE | re.DOTALL,
    )
    m = pattern.search(body)
    if not m:
        return ""
    return _strip_simple_md(m.group(1).strip())


def extract_analogy(body: str):
    s = extract_section(body, "类比入口")
    if not s:
        return ""
    for ln in s.split("\n"):
        ln = ln.strip().lstrip("> ").strip()
        if ln:
            sm = re.match(r"^([^。！？?!？\n]+[。！？?!]?)\s*", ln)
            return sm.group(1) if sm else ln
    return ""


def extract_wikilinks(fm, body):
    raw = " ".join([
        " ".join(fm.get("关联", [])) if isinstance(fm.get("关联"), list) else (fm.get("关联") or ""),
        body,
    ])
    links = re.findall(r"\[\[([^\]]+?)\]\]", raw)
    # 额外：关联字段里的纯文本引用（无 [[ ]] 包裹）也作为候选，
    # 由 resolve_wikilink 校验是否命中已存在/新建节点，未命中则丢弃，不会造无效链接。
    rel = fm.get("关联")
    if isinstance(rel, list):
        links.extend(str(x).strip() for x in rel if x)
    elif isinstance(rel, str):
        links.extend(x.strip() for x in re.split(r"[，,]", rel) if x.strip())
    return links


def wikilink_to_filename(name: str):
    if not name:
        return ""
    # 1) 精确（无日期）
    candidates = list(VAULT.glob(f"{name}.md"))
    if candidates:
        return candidates[0].name
    # 2) 带日期后缀（name 是文件名主体前缀）
    candidates = list(VAULT.glob(f"{name}-*.md"))
    if candidates:
        return sorted(candidates, reverse=True)[0].name
    # 3) 包含匹配（name 是中间片段，如 '通感一体化天线ISAC-20260712'
    #    实际文件是 '技术概念-通感一体化天线ISAC-20260712.md'）
    candidates = list(VAULT.glob(f"*{name}*.md"))
    if candidates:
        return sorted(candidates, reverse=True)[0].name
    return ""


# ===================== 复用 render-all-tech-cards.py 的渲染逻辑 =====================
def md_to_html(md_text: str):
    if not md_text:
        return ""
    text = re.sub(r'```\n```\n', '```\n\n```\n\n', md_text)
    text = re.sub(r'([：:。！!])\n-', r'\1\n\n-', text)
    text = re.sub(r'([：:。！!])\n(\d+\.)', r'\1\n\n\2', text)
    text = re.sub(r'```\n\n- ', '```\n\n\n- ', text)
    import markdown as _md
    return _md.markdown(text, extensions=["tables", "fenced_code"])


def strip_markdown(text: str):
    if not text:
        return ""
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'__(.+?)__', r'\1', text)
    text = text.strip()
    return text


def normalize_node(node: dict):
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
    related = [o.get("targetId", "") for o in node.get("outgoing", [])]
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


def render_one(node: dict) -> Path:
    import jinja2
    env = jinja2.Environment(
        loader=jinja2.FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=jinja2.select_autoescape(["html"]),
    )
    tmpl = env.get_template("technology.html")
    html = tmpl.render(**normalize_node(node))
    out = RENDERED_DIR / f"{node['id']}.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    return out


# ===================== 业务函数 =====================
def find_pending(readme_text: str):
    """返回 [(basename, section_prefix, full_filename)]，仅 待上传 行。
    兼容两种写法：「⏳ 待上传」（带符号）和「待上传」（无符号，2026-08-09 README 修正后格式）。
    文件位于子目录：报告/、技术概念/、指标术语/、零部件/、材料/
    """
    lines = readme_text.split("\n")
    current_prefix = None
    current_section = None
    pending = []
    for line in lines:
        hm = re.match(r"^###\s+(技术概念|指标术语|零部件|材料|报告)", line)
        if hm:
            current_section = hm.group(1)
            current_prefix = current_section + "/"
            continue
        # 表格行: | idx | name | date | status | flag |
        m = re.match(r"^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*[^|]*\|\s*[^|]*\|\s*((?:⏳\s*)?待上传|✅\s*已上传)\s*\|", line)
        if m and "待上传" in m.group(3) and "已上传" not in m.group(3):
            basename = m.group(2).strip()
            # README 里的条目格式可能是 "报告-标题-日期" 或 "标题-日期"
            # 文件实际位置：子目录/报告-标题-日期.md
            # 尝试多种可能的文件名
            possible_names = [
                f"{current_section}-{basename}.md",  # 报告-标题-日期.md
                f"{basename}.md",  # 标题-日期.md
            ]
            found = False
            for pname in possible_names:
                candidate = Path(VAULT) / current_prefix / pname
                if candidate.exists():
                    full = f"{current_prefix}{pname}"
                    pending.append((basename, current_prefix, full))
                    found = True
                    break
            if not found:
                # 记录但不跳过，后续会报错
                pending.append((basename, current_prefix, f"{current_prefix}{possible_names[0]}"))
    return pending


def build_node(fname: str, type_id: str):
    full_path = VAULT / fname
    content = full_path.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(content)
    slug = slugify(fname)
    node_id = f"{type_id}-{slug}"
    raw_name = re.sub(r"\.md$", "", fname, flags=re.IGNORECASE)
    raw_name = re.sub(r"-\d{8}$", "", raw_name)
    for prefix, _ in TYPE_PREFIX_MAP:
        if raw_name.startswith(prefix):
            raw_name = raw_name[len(prefix):]
            break
    name_en = ""
    m = re.search(r"[\(|（]([A-Za-z0-9\-\s\./]+)[\)|）]", fname)
    if m:
        name_en = m.group(1).strip()
    tags = []
    raw_tags = fm.get("标签")
    if isinstance(raw_tags, str):
        tags = re.findall(r"[\[【]?([^,，\]】\s]+)[,，\]】\s]?", raw_tags)
        tags = [t.strip() for t in tags if t.strip()]
    elif isinstance(raw_tags, list):
        for t in raw_tags:
            t = str(t).strip()
            if t:
                tags.append(t)
    one_liner = extract_one_liner(body)
    analogy = extract_analogy(body)
    all_sections = extract_all_sections(body)
    return {
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
        "sections": all_sections,
        "outgoing": [],
    }


def resolve_existing_id_map(kg):
    name_to_id = {}
    for n in kg["nodes"]:
        name_to_id[n["filename"]] = n["id"]
        name_to_id[n["name"]] = n["id"]
    return name_to_id


def resolve_wikilink(text, name_to_id):
    text = text.strip()
    if text in name_to_id:
        return name_to_id[text]
    fname = wikilink_to_filename(text)
    if fname and fname in name_to_id:
        return name_to_id[fname]
    return ""


def build_links_for(new_nodes, existing_id_map):
    """给 new_nodes 填充 outgoing，并返回新增的 links 列表（已对现有 links 去重）。"""
    # 合并 id 映射（现有 + 新建）
    id_map = dict(existing_id_map)
    for n in new_nodes:
        id_map.setdefault(n["filename"], n["id"])
        id_map.setdefault(n["name"], n["id"])

    # 现有 links 的 (source,target) 集合
    existing_link_keys = set()
    for l in kg_links_cache:
        existing_link_keys.add((l["source"], l["target"]))

    new_links = []
    for node in new_nodes:
        content = (VAULT / node["filename"]).read_text(encoding="utf-8")
        fm, body = parse_frontmatter(content)
        wikilinks = extract_wikilinks(fm, body)
        for w in wikilinks:
            tgt = resolve_wikilink(w, id_map)
            if not tgt or tgt == node["id"]:
                continue
            edge = (node["id"], tgt)
            if edge in existing_link_keys:
                # 仍确保 outgoing 里有（幂等）
                if not any(o["targetId"] == tgt for o in node["outgoing"]):
                    node["outgoing"].append({"targetId": tgt, "label": "关联"})
                continue
            existing_link_keys.add(edge)
            new_links.append({"source": node["id"], "target": tgt, "type": "related"})
            node["outgoing"].append({"targetId": tgt, "label": "关联"})
    return new_links


def update_readme(readme_text, processed_basenames):
    lines = readme_text.split("\n")
    # 1) 行内 ⏳/待上传 -> ✅（仅匹配表格数据行）
    for bn in processed_basenames:
        for k, line in enumerate(lines):
            if re.search(r"\|\s*" + re.escape(bn) + r"\s*\|", line) and "待上传" in line:
                lines[k] = line.replace("⏳ 待上传", "✅ 已上传").replace("⏳待上传", "✅已上传").replace("| 待上传", "| ✅ 已上传").replace("|待上传", "|✅ 已上传")
                break
    # 2) 重算每个 ### 小节的 已上传/待上传 计数
    TYPE_NAMES = {"技术概念", "指标术语", "零部件", "材料"}
    headers = []
    for i, line in enumerate(lines):
        m = re.match(r"^###\s+(.+?)（(\d+)\s*篇[^）]*）", line)
        if m:
            headers.append((i, m.group(1), int(m.group(2))))

    def section_range(idx):
        nxt = len(lines)
        for j in headers:
            if j[0] > idx:
                nxt = j[0]
                break
        return range(idx + 1, nxt)

    # 2a) 统计所有小节的自身计数（只数表格行 `|` 开头，忽略图例正文）
    section_counts = {}
    agg = {"up": 0, "pe": 0}
    for h in headers:
        idx, name, total = h
        up = pe = 0
        for k in section_range(idx):
            if not lines[k].lstrip().startswith("|"):
                continue
            if re.search(r"✅\s*已上传", lines[k]):
                up += 1
            elif re.search(r"(?:⏳\s*)?待上传", lines[k]):
                pe += 1
        section_counts[name] = (up, pe)
        if name in TYPE_NAMES:
            agg["up"] += up
            agg["pe"] += pe
    # 2b) 重写表头：4 类真实小节与规划/模板用自身计数；
    #     仅「笔记索引」这种聚合小节用 4 类合计（反映全部笔记总状态）
    for h in headers:
        idx, name, total = h
        if name == "笔记索引":
            up, pe = agg["up"], agg["pe"]
        else:
            up, pe = section_counts[name]
        lines[idx] = f"### {name}（{total} 篇 · 已上传 {up} · 待上传 {pe}）"
    return "\n".join(lines)


def detect_system_proxy():
    """从 Windows 注册表读取系统代理（瓦力/Steam++ 的「系统代理」模式会写入这里）。
    返回 'http://host:port'，或 ''（未启用 / 读不到 / 非 Windows）。
    支持 ProxyServer 形如 'http=127.0.0.1:26561;https=127.0.0.1:26561' 或纯 '127.0.0.1:26561'。"""
    if winreg is None:
        return ""
    try:
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Internet Settings",
        )
        try:
            enabled = winreg.QueryValueEx(key, "ProxyEnable")[0]
        except FileNotFoundError:
            return ""
        if not enabled:
            return ""
        try:
            server = winreg.QueryValueEx(key, "ProxyServer")[0]
        except FileNotFoundError:
            return ""
        server = (server or "").strip()
        if not server:
            return ""
        # 解析出 https/http 地址
        addr = ""
        if "=" in server:
            for part in server.split(";"):
                if "=" in part:
                    proto, val = part.split("=", 1)
                    if proto.strip().lower() in ("https", "http"):
                        addr = val.strip()
                        break
            if not addr:
                addr = server.split(";")[0].split("=", 1)[-1].strip()
        else:
            addr = server
        if not addr.startswith("http://") and not addr.startswith("https://"):
            addr = "http://" + addr
        return addr
    except Exception as e:
        print(f"   ⚠️  读取系统代理失败（将尝试直连）: {e}")
        return ""


def make_git_env():
    """构造 git 子进程环境变量：
    - 始终关闭 schannel 证书吊销检查（Windows 老坑，跨项目硬规则）；
    - 自动套用系统代理（若检测到），否则直连。"""
    env = os.environ.copy()
    env["GIT_SSL_NO_VERIFY"] = "1"
    proxy = detect_system_proxy()
    if proxy:
        for k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"):
            env[k] = proxy
        print(f"   🔌 采用系统代理推送: {proxy}")
    else:
        print("   🔌 未检测到系统代理，直连模式")
    return env


def strip_proxy_env(env: dict):
    """移除代理相关变量，用于 fallback 直连。"""
    return {k: v for k, v in env.items()
            if k not in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy")}


def git_sync_start(repo: Path):
    """真正执行前，先把本地仓库同步到 origin/main 最新（基于最新 KG 增量，避免丢失 daily 提交）。
    工作树必须干净；若有未提交改动则中止，防止覆盖。"""
    env = make_git_env()
    git = ["git", "-C", str(repo)]
    st = subprocess.run(git + ["status", "--porcelain"], env=env, capture_output=True, text=True)
    if st.stdout.strip():
        raise RuntimeError("工作树存在未提交改动，已中止以避免覆盖。请先 `git status` 处理后再运行。")
    r = subprocess.run(git + ["pull", "--rebase", REMOTE, BRANCH], env=env, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"git pull --rebase 失败:\n{r.stdout}\n{r.stderr}")


def git_push(repo: Path, files: list):
    env = make_git_env()
    git = ["git", "-C", str(repo)]

    def run(args, env_=None, allow_fail=False):
        e = env_ if env_ is not None else env
        r = subprocess.run(git + args, env=e, capture_output=True, text=True)
        if r.returncode != 0 and not allow_fail:
            raise RuntimeError(f"git {' '.join(args)} 失败:\n{r.stdout}\n{r.stderr}")
        return r

    # 先提交本次变更（工作树变干净），再 pull --rebase 同步（吸收 daily 14:30 可能的新提交），最后推送
    for f in files:
        run(["add", str(f)])
    st = run(["diff", "--cached", "--quiet"], allow_fail=True)
    if st.returncode != 0:
        ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        run(["commit", "-m", f"kg: 增量上传待上传笔记 {ts}"])
        run(["pull", "--rebase", REMOTE, BRANCH])
        # push：先走（可能的）代理；若失败且当前套了代理，则 fallback 直连
        pr = subprocess.run(git + ["push", REMOTE, f"HEAD:{BRANCH}"], env=env, capture_output=True, text=True)
        if pr.returncode != 0 and any(
            k in env for k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy")
        ):
            print("   ⚠️  代理推送失败，尝试直连 fallback ...")
            pr = subprocess.run(
                git + ["push", REMOTE, f"HEAD:{BRANCH}"],
                env=strip_proxy_env(env),
                capture_output=True,
                text=True,
            )
        if pr.returncode != 0:
            raise RuntimeError(f"git push 失败:\n{pr.stdout}\n{pr.stderr}")
        print("   ✅ 已 git push 到 GitHub（将触发 Pages 部署）")
        return True
    return False


# ===================== 全局缓存（供 build_links_for 使用） =====================
kg_links_cache = []


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="真正执行；默认 dry-run")
    ap.add_argument("--only", help="只处理指定 basename（调试用）", default=None)
    args = ap.parse_args()

    # Windows 控制台默认 GBK，打印 emoji 会抛 UnicodeEncodeError 直接崩主流程；
    # 强制 stdout/stderr 为 UTF-8，让脚本在中文 Windows 下能正常跑完。
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

    ensure_deps()

    if not README.exists():
        print(f"❌ README 不存在: {README}")
        sys.exit(1)
    if not KG_FILE.exists():
        print(f"❌ KG 文件不存在: {KG_FILE}")
        sys.exit(1)

    readme_text = README.read_text(encoding="utf-8")
    if args.apply:
        # 真正执行前先同步到最新，确保基于最新 KG 增量
        git_sync_start(REPO)
        readme_text = README.read_text(encoding="utf-8")
    pending = find_pending(readme_text)
    if args.only:
        pending = [p for p in pending if args.only in p[0]]
    if not pending:
        print("✅ 当前没有 ⏳ 待上传笔记，无需操作。")
        sys.exit(0)

    print(f"🔎 发现 {len(pending)} 篇待上传笔记:")
    for bn, prefix, full in pending:
        print(f"   - {full}")

    kg = json.loads(KG_FILE.read_text(encoding="utf-8"))
    global kg_links_cache
    kg_links_cache = kg.get("links", [])

    # 找出 vault 里真实存在的文件
    existing_id_map = resolve_existing_id_map(kg)
    new_nodes = []
    new_basenames = []
    skipped = []
    for bn, prefix, full in pending:
        if not (VAULT / full).exists():
            print(f"   ⚠️  vault 中找不到 {full}，跳过")
            skipped.append(bn)
            continue
        # 判定 type
        type_id = "technology"
        for pfx, tid in TYPE_PREFIX_MAP:
            if full.startswith(pfx):
                type_id = tid
                break
        node = build_node(full, type_id)
        if node["id"] in existing_id_map.values():
            print(f"   ⚠️  节点 id={node['id']} 已存在 KG，跳过")
            skipped.append(bn)
            continue
        new_nodes.append(node)
        new_basenames.append(bn)

    if not new_nodes:
        print("✅ 没有可新增的节点（全部跳过或已存在）。")
        sys.exit(0)

    new_links = build_links_for(new_nodes, existing_id_map)

    print(f"\n📦 计划新增节点: {len(new_nodes)}")
    for n in new_nodes:
        print(f"   + {n['id']}  (links: {len(n['outgoing'])})")
    print(f"📦 计划新增 links: {len(new_links)}")

    if not args.apply:
        print("\n⚠️  当前为 dry-run，未做任何修改。加 --apply 真正执行。")
        sys.exit(0)

    # ---- 真正执行 ----
    # 1) 并入 KG
    kg["nodes"].extend(new_nodes)
    kg["links"].extend(new_links)
    # 更新统计
    stats = kg.get("stats", {})
    for n in new_nodes:
        stats[n["type"]] = stats.get(n["type"], 0) + 1
    kg["stats"] = stats
    kg["totalNotes"] = len(kg["nodes"])
    kg["lastUpdate"] = datetime.datetime.now().strftime("%Y-%m-%d")
    KG_FILE.write_text(json.dumps(kg, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"💾 已写入 KG: {KG_FILE}")

    # 2) 只渲染新卡片
    RENDERED_DIR.mkdir(parents=True, exist_ok=True)
    rendered = []
    for n in new_nodes:
        out = render_one(n)
        rendered.append(out)
        print(f"   🖼  渲染: {out.name}  ({out.stat().st_size // 1024} KB)")

    # 3) 回写 README（用表格列里的 basename 匹配行）
    new_text = update_readme(readme_text, new_basenames)
    README.write_text(new_text, encoding="utf-8")
    print(f"📝 已更新 README 状态: {README}")

    # 4) 推送（仅 KG json + 新卡片；README 在 vault，单独本地保存）
    files = [str(KG_FILE)] + [str(r) for r in rendered]
    try:
        pushed = git_push(REPO, files)
        if pushed:
            print("🚀 已 git push 到 GitHub（将触发 Pages 部署）")
        else:
            print("ℹ️  无 git 变更，未推送")
    except Exception as e:
        print(f"❌ git push 失败: {e}")
        sys.exit(1)

    print(f"\n✅ 完成：新增 {len(new_nodes)} 张卡片并上传。")


if __name__ == "__main__":
    main()
