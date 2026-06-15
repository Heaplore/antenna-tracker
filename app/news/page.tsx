'use client'
import { useState } from 'react'
import newsData from '@/app/_data/news.json'

type NewsItem = {
  id: number
  date: string
  title: string
  source: string
  summary: string
  tags: string[]
  url: string
}

// 天线相关性白名单：与 scripts/fetch-data.js 的 ANTENNA_KEYWORDS 保持同步
// 老大拍板：news 页面只显示天线行业直接相关的内容（剔除工信部非天线条目等）
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
]

function isAntennaRelated(item: NewsItem): boolean {
  if (!item || typeof item !== 'object') return false
  const tags = Array.isArray(item.tags) ? item.tags.join(' ') : ''
  const text = `${item.title || ''} ${item.summary || ''} ${tags}`.toLowerCase()
  return ANTENNA_KEYWORDS.some(kw => text.includes(kw.toLowerCase()))
}

export default function NewsPage() {
  // 将 news.json (object) 转换为数组
  // 注意：newsData 里可能含非 object 值（比如 lastUpdate 字符串），
  // 必须过滤掉，否则下面 n.source / n.title 访问会被 TS 拒掉，build 会失败。
  // 同时按天线相关性白名单二次过滤（双保险：即使数据层漏了脏数据，前端也会兜住）
  const newsArray = (Object.values(newsData) as NewsItem[]).filter(
    (n) => n && typeof n === 'object' && 'title' in n && isAntennaRelated(n)
  )
const [activeFilter, setActiveFilter] = useState('全部')
const [showTimeline, setShowTimeline] = useState(true)

// 从新闻数据提取所有来源
const sources = ['全部', ...Array.from(new Set(newsArray.map(n => n.source)))]

const filtered = activeFilter === '全部'
  ? newsArray
  : newsArray.filter(n => n.source === activeFilter)

  const sourceTypeColors: Record<string, string> = {
    '腾讯网': '#e53935',
    '产业调研网': '#43a047',
    '中商产业研究院': '#ff9800',
    '行业研究': '#9c27b0',
    'C114通信网': '#1565c0',
    '通信世界网': '#00897b',
    '飞象网': '#ad1457',
  }

  return (
    <div>
      <header className="header">
        <h1>📰 行业动态</h1>
        <p>天线行业最新资讯、新闻动态 · 来源筛选 · 时间轴展示</p>
      </header>

      {/* 筛选工具栏 */}
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {sources.map(src => (
              <button
                key={src}
                onClick={() => setActiveFilter(src)}
                className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors"
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: activeFilter === src ? '2px solid #667eea' : '2px solid #e0e0e0',
                  background: activeFilter === src ? '#667eea' : 'white',
                  color: activeFilter === src ? 'white' : '#666',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: activeFilter === src ? 600 : 400,
                }}
              >
                {src}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="px-3 py-1.5 rounded-md text-xs sm:text-sm transition-colors"
            style={{
              padding: '6px 14px', borderRadius: '6px', border: '1px solid #e0e0e0',
              background: showTimeline ? '#667eea' : 'white',
              color: showTimeline ? 'white' : '#666', cursor: 'pointer', fontSize: '0.85rem'
            }}
          >
            {showTimeline ? '📋 列表视图' : '⏱️ 时间轴视图'}
          </button>
        </div>
        <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#999' }}>
          共 {filtered.length} 条资讯
        </div>
      </section>

      {/* 列表视图 */}
      {!showTimeline ? (
        <section className="card">
          <ul className="news-list">
            {filtered.map((news) => (
              <li key={news.id} className="news-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div className="news-date">
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px',
                      background: (sourceTypeColors[news.source] || '#999') + '20',
                      color: sourceTypeColors[news.source] || '#666',
                      fontWeight: 600, fontSize: '0.75rem'
                    }}>
                      {news.source}
                    </span>
                    {' '}{news.date}
                  </div>
                </div>
                <div className="news-title">
                  <a href={news.url} target="_blank" rel="noopener noreferrer">
                    {news.title}
                  </a>
                </div>
                <div className="news-summary">{news.summary}</div>
                <div className="news-tags">
                  {news.tags?.map((tag, j) => (
                    <span key={j} className="tag">{tag}</span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        /* 时间轴视图 */
        <section className="card">
          <div style={{ position: 'relative', paddingLeft: '30px' }}>
            {filtered
              .slice() // avoid mutating
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((news, i) => (
                <div key={news.id} style={{
                  position: 'relative',
                  paddingBottom: '24px',
                  paddingLeft: '20px',
                  borderLeft: '2px solid #e0e0e0',
                  marginLeft: '10px'
                }}>
                  {/* 时间点 */}
                  <div style={{
                    position: 'absolute',
                    left: '-31px',
                    top: '0',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#667eea',
                    border: '3px solid white',
                    boxShadow: '0 0 0 2px #667eea'
                  }} />

                  <div style={{ fontSize: '0.75rem', color: '#999', marginBottom: '6px' }}>{news.date}</div>
                  <div style={{
                    fontSize: '0.95rem', fontWeight: 600, marginBottom: '6px',
                    color: '#333'
                  }}>
                    <a href={news.url} target="_blank" rel="noopener noreferrer" style={{ color: '#333', textDecoration: 'none' }}>
                      {news.title}
                    </a>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px',
                      background: (sourceTypeColors[news.source] || '#999') + '20',
                      color: sourceTypeColors[news.source] || '#666',
                      fontSize: '0.7rem', fontWeight: 600
                    }}>
                      {news.source}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.6 }}>{news.summary}</div>
                  <div className="news-tags">
                    {news.tags?.map((tag, j) => (
                      <span key={j} className="tag" style={{ fontSize: '0.75rem' }}>{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  )
}