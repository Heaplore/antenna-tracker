/**
 * 一次性脚本：用 isAntennaRelated 白名单过滤现有 news.json
 * 同时处理：public/data/news.json + app/_data/news.json + out/data/news.json
 * 用法: node scripts/filter-news.js
 */
const fs = require('fs');
const path = require('path');

// 复用 fetch-data.js 的过滤逻辑（已抽成独立函数）
// 这里直接 import 不可行（fetch-data.js 是 IIFE 启动），所以把白名单复制一份。
// 关键改动同步：fetch-data.js 那边的 ANTENNA_KEYWORDS 改了之后，这里也要同步。
const ANTENNA_KEYWORDS = [
  '天线', 'AAU', 'aau', 'RIS', 'ris', 'MIMO', 'mimo', '相控阵', '毫米波', 'AiP', 'aip', 'LCP', 'lcp',
  '智能超表面', '波束赋形', '波束管理', '波束扫描', '可重构电磁表面', '可重构智能表面',
  'massive', 'Massive',
  '微波', '射频', 'RRU', 'rru', 'BBU', 'bbu', '塔顶放大器', '塔放', '滤波器', '双工器', '合路器',
  'PTFE', 'ptfe', '高频PCB', '高频覆铜板', '介电常数',
  '5G', '5g', '6G', '6g', '5G-A', '5G Advanced', '5.5G', 'n258', 'n260', 'n257', 'n261', 'n262',
  'E-band', 'V-band', 'sub-6',
  'Starlink', 'starlink', 'SpaceX', 'spacex', 'FWA', 'fwa', 'CPE', 'cpe', 'Mesh', 'mesh',
  '集采', '运营商集采', '运营商招标',
  '基站',
  '华为', '中兴', '盛路', '通宇', '亨鑫', '京信', '世嘉', '信维', '硕贝德', '摩比', '三维通信',
  '中国电信', '中国移动', '中国联通', '中国广电',
  '村田', 'Rogers', 'Taconic', '苹果供应链', 'iPhone', 'LCP软板',
];

function isAntennaRelated(item) {
  if (!item || typeof item !== 'object') return false;
  const tags = Array.isArray(item.tags) ? item.tags.join(' ') : '';
  const text = `${item.title || ''} ${item.summary || ''} ${tags}`.toLowerCase();
  return ANTENNA_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.log(`  ! 读取失败: ${filePath} (${e.message})`);
    return null;
  }
}

function filterNewsFile(filePath) {
  console.log(`\n[filter] 处理: ${filePath}`);
  if (!fs.existsSync(filePath)) {
    console.log('  ! 文件不存在，跳过');
    return { before: 0, after: 0, removed: 0 };
  }
  const raw = loadJson(filePath);
  if (!raw) return { before: 0, after: 0, removed: 0 };

  const isObject = raw && typeof raw === 'object' && !Array.isArray(raw);
  const items = isObject
    ? Object.values(raw).filter(v => v && typeof v === 'object' && 'title' in v)
    : raw.filter(v => v && typeof v === 'object' && 'title' in v);

  const before = items.length;
  const kept = items.filter(isAntennaRelated);
  const removed = before - kept.length;

  if (isObject) {
    // 重建对象：保留 lastUpdate，按 item.id 重新索引；剔除无关项
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
      if (k === 'lastUpdate') out.lastUpdate = v;
      // 非业务 key (纯数字时间戳串等) 一并丢掉
    }
    out.lastUpdate = new Date().toISOString().split('T')[0];
    let i = 0;
    for (const item of kept) {
      i += 1;
      const key = item.id || `item_${i}`;
      out[key] = item;
    }
    fs.writeFileSync(filePath, JSON.stringify(out, null, 2));
  } else {
    fs.writeFileSync(filePath, JSON.stringify(kept, null, 2));
  }

  console.log(`  ✅ ${before} → ${kept.length}（剔除 ${removed} 条）`);
  return { before, after: kept.length, removed };
}

const ROOT = path.join(__dirname, '..');
const targets = [
  path.join(ROOT, 'public', 'data', 'news.json'),
  path.join(ROOT, 'app', '_data', 'news.json'),
  path.join(ROOT, 'out', 'data', 'news.json'),
];

console.log('═══════════════════════════════════════');
console.log('  news.json 天线相关性过滤（一次性）');
console.log('═══════════════════════════════════════');

let totalBefore = 0, totalAfter = 0;
for (const t of targets) {
  const r = filterNewsFile(t);
  totalBefore += r.before;
  totalAfter += r.after;
}

console.log('\n───────────────────────────────────────');
console.log(`  合计: ${totalBefore} → ${totalAfter}（剔除 ${totalBefore - totalAfter} 条）`);
console.log('═══════════════════════════════════════');
