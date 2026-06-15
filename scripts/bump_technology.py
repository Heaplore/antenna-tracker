#!/usr/bin/env python3
"""
Bump technology.json (idempotent):
  - lastUpdate -> 今天 (动态, 不写死)
  - industryOverview: 仅在未包含 "【2026 H1 增量】" 时追加 H1 大事件
  - technologyDetail[0] (Massive MIMO) currentStatus: 仅在未包含 "【2026-06 更新】" 时追加
  - hypeCycle.items 字段从 technologies 派生 (修复 schema bug)

支持 CI 重复运行, 不产生重复内容.
"""
import json
import shutil
import datetime as _dt
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "app" / "_data" / "technology.json"
DST = ROOT / "public" / "data" / "technology.json"

TODAY = _dt.date.today().isoformat()
TODAY_SHORT = _dt.date.today().strftime('%Y-%m')

# 2026 H1 大事件 (用于 industryOverview)
H1_2026_NEWS = (
    "2026 年上半年行业出现三大里程碑: ① 3GPP Release 19 于 6 月初完成功能冻结, "
    "AI 波束赋形进入标准明确期; ② 中国星网 GW 星座与千帆星座二期招标完成, "
    "卫星平板相控阵终端需求下半年起将集中释放; ③ 鸿蒙智行/小米 SU7 等高端车型"
    "推动车载毫米波雷达与 5G-V2X 车顶天线集成方案规模上量。"
    "运营商集采侧, 中国移动 5G-A 700MHz+2.6GHz+4.9GHz 三频融合天线集采结果 5 月落地, "
    "128T128R 占比首次突破 30%, 标志着国内 Massive MIMO 正式进入下一代。"
    "材料端, LCP 软板国产化率 2026 Q1 已突破 40%, 村田垄断格局出现松动信号。"
    "海外侧, RIS 外场试验持续推进, 但商用进度仍慢于预期, 国内华为联合中国移动在杭州亚运村完成"
    "第二阶段 200 平方米规模部署, 覆盖增强效果稳定在 35-40% 区间。"
)

MASSIVE_MIMO_TAIL = (
    "中国移动 5G-A 三频融合天线集采 5 月落标, 128T128R 配置占比首次突破 30%,"
    "单 AAU 价值量同比上升 18%; 华为新一代 MetaAAU 在 128T128R + AI 波束赋形基础上,"
    "能耗较上一代下降 22%, 已在国内 5 个试点城市完成外场测试。"
)


def main():
    data = json.loads(SRC.read_text(encoding="utf-8"))

    old_last = data.get("lastUpdate")
    print(f"[bump_technology] old lastUpdate: {old_last}")

    # 1. 改 lastUpdate (动态)
    data["lastUpdate"] = TODAY

    # 2. industryOverview: idempotent append (标记避免重复)
    overview = data.get("industryOverview", "")
    marker_overview = "【2026 H1 增量】"
    if marker_overview not in overview:
        data["industryOverview"] = overview + "\n\n" + marker_overview + H1_2026_NEWS
        print(f"[bump_technology] industryOverview: appended {marker_overview}")
    else:
        print(f"[bump_technology] industryOverview: {marker_overview} already present, skip")

    # 3. Massive MIMO currentStatus: idempotent append
    marker_mimo = f"【{TODAY_SHORT} 更新】"
    if data.get("technologyDetail"):
        status = data["technologyDetail"][0].get("currentStatus", "")
        if marker_mimo not in status:
            data["technologyDetail"][0]["currentStatus"] = (
                status + "\n\n" + marker_mimo + MASSIVE_MIMO_TAIL
            )
            print(f"[bump_technology] Massive MIMO: appended {marker_mimo}")
        else:
            print(f"[bump_technology] Massive MIMO: {marker_mimo} already present, skip")

    # 4. 修复 hypeCycle schema bug: items 应该是 technologies 的别名
    hc = data.get("hypeCycle", {})
    if "technologies" in hc and "items" not in hc:
        hc["items"] = hc["technologies"]
        print("[bump_technology] hypeCycle.items derived from technologies")

    # 写回
    SRC.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    DST.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SRC, DST)

    print(f"[bump_technology] new lastUpdate: {data['lastUpdate']}")
    print(f"[bump_technology] synced -> {DST}")


if __name__ == "__main__":
    main()
