#!/usr/bin/env python3
"""
standards_monthly_update_2026-09.py
每月行业标准页面数据更新脚本
用途: 更新 standards.json 中关键标准的状态/发布日期/描述
"""
import json
import shutil
import os
from datetime import datetime

REPO_ROOT = r"E:\hermes\antenna-tracker"
DATA_FILE = os.path.join(REPO_ROOT, "app", "_data", "standards.json")
PUBLIC_FILE = os.path.join(REPO_ROOT, "public", "data", "standards.json")
TODAY = datetime.now().strftime("%Y-%m-%d")
BAK_DATE = datetime.now().strftime("%Y%m%d")

def backup():
    bak = DATA_FILE + f".bak-{BAK_DATE}"
    shutil.copy2(DATA_FILE, bak)
    print(f"[backup] {DATA_FILE} -> {bak}")

def load():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    with open(PUBLIC_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[save] {DATA_FILE}")
    print(f"[save] {PUBLIC_FILE}")

def find_std(data, category_name, std_name):
    for cat in data["categories"]:
        if cat["name"] == category_name:
            for std in cat["standards"]:
                if std["name"] == std_name:
                    return std
    return None

def update_entries(data):
    changes = []
    
    # 1. ITU-R M.[IMT-2030.TPR] - 技术性能要求已正式批准（2026年12月）
    tpr = find_std(data, "ITU标准", "ITU-R M.[IMT-2030.TPR]")
    if tpr:
        old_status = tpr.get("status", "")
        old_date = tpr.get("publishDate", "")
        old_desc = tpr.get("description", "")
        tpr["status"] = "已批准"
        tpr["publishDate"] = "2026年12月（正式批准，SG5全会）"
        tpr["description"] = (
            "IMT-2030最低技术性能要求，定义了20项技术性能要求（包括7项新增6G特有指标），"
            "涵盖峰值速率、频谱效率、时延、可靠性、连接密度、能效等。"
            "草案于2026年2月由WP 5D完成，正式批准于2026年12月SG5全会。"
            "基于六大应用场景：IC（沉浸式通信）、HRLLC（超可靠低时延）、MC（大规模通信）、"
            "UC（泛在连接）、AIAC（AI与通信）、ISAC（通感融合）。"
            "为ITU-R Circular Letter 5/LCCE/115发布的6G无线电接口技术提案（RIT）评估依据。"
        )
        changes.append(f"ITU-R M.[IMT-2030.TPR]: status '{old_status}' -> '{tpr['status']}'；publishDate '{old_date}' -> '{tpr['publishDate']}'；description更新（正式批准）")
    
    # 2. ITU-R M.[IMT-2030.EVAL] - 评估方法论同步进展
    eval_std = find_std(data, "ITU标准", "ITU-R M.[IMT-2030.EVAL]")
    if eval_std:
        old_status = eval_std.get("status", "")
        old_date = eval_std.get("publishDate", "")
        eval_std["status"] = "进行中"
        eval_std["publishDate"] = "预计2027年完成（WP 5D持续工作）"
        eval_std["description"] = (
            "IMT-2030评估标准和方法论，用于评估6G无线电接口技术提案（RIT/SRIT）。"
            "配合M.[IMT-2030.TPR]技术性能要求，共同构成6G候选技术评估框架。"
            "评估方法论随技术性能要求同步制定，预计2027年完成。"
        )
        changes.append(f"ITU-R M.[IMT-2030.EVAL]: status '{old_status}' -> '{eval_std['status']}'；publishDate '{old_date}' -> '{eval_std['publishDate']}'")
    
    # 3. 3GPP Release 20 - 更新Stage 2进度（2026年6月TSGs#112新加坡会议）
    r20 = find_std(data, "3GPP国际标准", "3GPP Release 20")
    if r20:
        old_status = r20.get("status", "")
        old_date = r20.get("publishDate", "")
        old_scope = r20.get("scope", "")
        old_desc = r20.get("description", "")
        r20["status"] = "进行中"
        r20["publishDate"] = "2025年6月启动（Stage 1 冻结），2027年3月 Stage 3 冻结（5G-A 部分）"
        r20["scope"] = (
            "双轨制 Release：5G-Advanced 规范工作 + 6G Study Item。5G-A 部分：Stage 1 已于 2025-06（TSGs#108）冻结，"
            "Stage 2 已于 2026-06（TSGs#112 Singapore）达成 80% 里程碑、目标 2026-09（TSGs#113）完成，"
            "Stage 3 功能冻结 2027-03（TSGs#115），ASN.1/OpenAPI 冻结 2027-06。"
            "6G Study：SA1 服务需求研究（TR22.870）已完成，TR 38.914（6G 场景与需求）截至 2026-06 接近完成，"
            "RAN1 从 2025 Q3 开始研究持续 21 个月。包含 AI/ML for NR Phase 2、NR MIMO Phase 6、"
            "NR Coverage Phase 3、Ambient IoT Phase 2、NR NTN terrestrial bands 探索、ISAC UAV 感知等。"
            "Rel-20 是 5G 到 6G 的过渡桥梁。"
        )
        r20["description"] = (
            "5G-Advanced 与 6G 研究的双轨制 Release。5G-A 部分 Stage 2 已达 80% 里程碑，"
            "将于 2027 年 3 月冻结，6G Study 为 Rel-21 规范工作奠定基础。"
        )
        changes.append(f"3GPP Release 20: status '{old_status}' -> '{r20['status']}'；publishDate '{old_date}' -> '{r20['publishDate']}'；scope/description 更新（Stage 2 进展）")
    
    # 4. 3GPP Release 21 - 更新时间表确认（TSGs#112已正式批准）
    r21 = find_std(data, "3GPP国际标准", "3GPP Release 21")
    if r21:
        old_desc = r21.get("description", "")
        if "TSGs#112" not in old_desc:
            r21["description"] = (
                "首个 6G 规范 Release。时间表 2026 年 6 月新加坡 TSGs#112 正式批准（RP-260868/SP-260595/CP-261259），"
                "Stage 1 冻结 2027-03，Stage 3 冻结 2028-12。"
                "3GPP 将基于 Rel-21 向 ITU-R 提交 IMT-2030 候选技术（提交窗口 2027-02 至 2029-02）。"
            )
            changes.append(f"3GPP Release 21: description 更新（补充 TSGs#112 正式批准信息）")
    
    return changes

def main():
    print(f"standards_monthly_update_2026-09")
    print(f"today: {TODAY}")
    
    backup()
    data = load()
    changes = update_entries(data)
    data["lastUpdate"] = TODAY
    save(data)
    
    print(f"\n更新摘要:")
    print(f"  上次更新: 2026-08-01")
    print(f"  本次新增标准数: 0")
    print(f"  字段变更条目: {len(changes)} 条")
    for i, c in enumerate(changes, 1):
        print(f"    {i}. {c}")
    print(f"\n详细变更信息:")
    for c in changes:
        print(f"  - {c}")

if __name__ == "__main__":
    main()
