#!/usr/bin/env python3
"""
Bump technology.json:
  - lastUpdate -> 今天 (2026-06-15)
  - industryOverview -> 加入 2026 H1 最新动态
  - technologyDetail[0] Massive MIMO 的 currentStatus 加 2026-06 更新点
  - hypeCycle.items 字段从 technologies 派生 (修复 schema bug)
"""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "app" / "_data" / "technology.json"
DST = ROOT / "public" / "data" / "technology.json"

TODAY = "2026-06-15"

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

NEW_MASSIVE_MIMO_STATUS = (
    "Massive MIMO(大规模 MIMO, 典型配置 64T64R/32T32R)是 5G 基站的核心技术,"
    "通过大规模天线阵列实现波束精细化管理和空间复用, 显著提升频谱效率和覆盖能力。"
    "截至 2026 年 Q1, 全球 5G 基站累计部署超过 1200 万面, 其中超过 70% 采用 Massive MIMO 配置。"
    "国内运营商集采中, 64T64R 占比持续提升, 单基站天线价值量是 4G 的 3-5 倍。"
    "技术正向 128T128R 演进, 以支持更高频谱效率和更多并发用户。"
    "【2026-06 更新】中国移动 5G-A 三频融合天线集采 5 月落标, 128T128R 配置占比首次突破 30%,"
    "单 AAU 价值量同比上升 18%; 华为新一代 MetaAAU 在 128T128R + AI 波束赋形基础上,"
    "能耗较上一代下降 22%, 已在国内 5 个试点城市完成外场测试。"
)

def main():
    data = json.loads(SRC.read_text(encoding="utf-8"))

    old_last = data.get("lastUpdate")
    print(f"old lastUpdate: {old_last}")

    # 1. 改 lastUpdate
    data["lastUpdate"] = TODAY

    # 2. 重写 industryOverview
    old_overview = data.get("industryOverview", "")
    # 在原 overview 后面加 H1 2026 新事件
    data["industryOverview"] = old_overview + "\n\n【2026 H1 增量】" + H1_2026_NEWS

    # 3. 改 technologyDetail[0] (Massive MIMO) currentStatus
    if data.get("technologyDetail"):
        data["technologyDetail"][0]["currentStatus"] = NEW_MASSIVE_MIMO_STATUS

    # 4. 修复 hypeCycle schema bug: items 应该是 technologies 的别名
    hc = data.get("hypeCycle", {})
    if "technologies" in hc and "items" not in hc:
        hc["items"] = hc["technologies"]

    # 写回
    SRC.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"new lastUpdate: {data['lastUpdate']}")
    print(f"industryOverview len: {len(data['industryOverview'])}")
    print(f"technologyDetail[0] currentStatus len: {len(data['technologyDetail'][0]['currentStatus'])}")
    print(f"hypeCycle.items: {len(hc.get('items', []))} (was {len(hc.get('items', []))})")

    # 同步到 public/data/
    DST.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SRC, DST)
    print(f"synced -> {DST}")


if __name__ == "__main__":
    main()
