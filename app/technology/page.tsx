'use client'
import { useState } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ZAxis, LineChart, Line } from 'recharts'
import techData from '../../data/technology.json'

const PHASE_COLORS: Record<string, string> = {
  'trigger': '#9c27b0',
  'peak': '#e53935',
  'trough': '#ff9800',
  'slope': '#2196f3',
  'plateau': '#43a047'
}

const PHASE_NAMES: Record<string, string> = {
  trigger: '技术触发期',
  peak: '泡沫顶峰期',
  trough: '幻灭低谷期',
  slope: '复苏爬坡期',
  plateau: '生产力平稳期'
}

const PHASE_ORDER = ['trigger', 'peak', 'trough', 'slope', 'plateau']

// Gartner Hype Cycle 理论曲线
const HYPE_CURVE = [
  { year: 2014, maturity: 1 },
  { year: 2016, maturity: 3 },
  { year: 2018, maturity: 7 },
  { year: 2020, maturity: 9 },
  { year: 2021, maturity: 6 },
  { year: 2023, maturity: 4 },
  { year: 2025, maturity: 5 },
  { year: 2027, maturity: 6.5 },
  { year: 2029, maturity: 7.5 },
  { year: 2032, maturity: 9 },
]

// 气泡图统一数据（模块级别）x=年份 y=成熟度 z=大小 name/nameCn/phase/color
const scatterData = techData.hypeCycle.technologies.map((t) => {
  const maturityMap: Record<string, number> = {
    trigger: 2, peak: 8, trough: 3, slope: 5, plateau: 9
  }
  return {
    x: t.yearEmerging,
    y: maturityMap[t.phase],
    z: t.confidence === '高' ? 80 : t.confidence === '中' ? 55 : 35,
    name: t.name,
    nameCn: t.nameCn,
    phase: t.phase,
    color: PHASE_COLORS[t.phase],
  }
})

export default function TechnologyPage() {
  const [selectedTech, setSelectedTech] = useState(0)
  const [showHypeCycle, setShowHypeCycle] = useState(true)

  const currentTech = techData.technologyDetail[selectedTech]

  const handleBubbleClick = (data: any) => {
    if (!data || !data.name) return
    const idx = techData.technologyDetail.findIndex(t => t.name === data.name || t.nameCn === data.nameCn)
    if (idx >= 0) {
      setSelectedTech(idx)
    }
  }

  return (
    <div>
      <header className="header">
        <h1>🔬 行业技术</h1>
        <p>天线行业 Gartner 技术成熟度曲线 · 各技术发展现状 · 厂商路线对比</p>
        <p className="update-info">数据更新：{techData.lastUpdate}</p>
      </header>

      {/* 行业技术趋势概述 */}
      <section className="card">
        <h2>📝 行业技术趋势综述</h2>
        <p style={{ color: '#555', lineHeight: 1.8, fontSize: '0.95rem' }}>{techData.industryOverview}</p>
      </section>

      {/* Gartner 曲线气泡图 */}
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>📊 Gartner 技术成熟度曲线（Hype Cycle）</h2>
          <button
            onClick={() => setShowHypeCycle(!showHypeCycle)}
            style={{
              padding: '6px 16px', borderRadius: '6px', border: '1px solid #e0e0e0',
              background: showHypeCycle ? '#667eea' : 'white',
              color: showHypeCycle ? 'white' : '#666', cursor: 'pointer', fontSize: '0.85rem'
            }}
          >
            {showHypeCycle ? '🙈 隐藏' : '👁️ 显示'}
          </button>
        </div>

        {/* 阶段图例 */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {PHASE_ORDER.map(phase => (
            <div key={phase} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: PHASE_COLORS[phase] }} />
              <span style={{ fontSize: '0.8rem', color: '#666' }}>{PHASE_NAMES[phase]}</span>
            </div>
          ))}
        </div>

        {showHypeCycle && (
          <>
            <p style={{ fontSize: '0.85rem', color: '#999', marginBottom: '16px' }}>
              💡 气泡大小表示技术重要度（仅供参考），点击气泡查看技术详情 ↓
            </p>

            {/* Gartner 参考曲线 + 气泡 */}
            <ResponsiveContainer width="100%" height={360}>
              <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  type="number" dataKey="x" name="年份"
                  domain={[2013, 2036]} tick={{ fontSize: 11, fill: '#999' }}
                  tickLine={false} axisLine={{ stroke: '#e0e0e0' }}
                  label={{ value: '年份', position: 'insideBottom', offset: -20, fontSize: 11, fill: '#999' }}
                />
                <YAxis
                  type="number" dataKey="y" name="成熟度" domain={[0, 10]}
                  tick={{ fontSize: 11, fill: '#999' }} tickLine={false}
                  axisLine={{ stroke: '#e0e0e0' }}
                  tickFormatter={(v) => v === 1 ? '触发' : v === 5 ? '低谷' : v === 9 ? '成熟' : ''}
                  width={50}
                  label={{ value: '成熟度', angle: -90, position: 'insideLeft', offset: 15, fontSize: 11, fill: '#999' }}
                />
                <ZAxis range={[40, 80]} />

                {/* Gartner参考曲线（用 ReferenceLine + LineChart 实现） */}
                <LineChart data={HYPE_CURVE} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Line
                    type="monotone" dataKey="maturity"
                    stroke="#ccc" strokeWidth={2} dot={false}
                    strokeDasharray="5 5" legendType="none"
                    isAnimationActive={false}
                  />
                </LineChart>

                <Tooltip
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const d = payload[0]?.payload
                    if (!d || !d.name) return null
                    return (
                      <div style={{
                        background: 'white', border: '1px solid #e0e0e0',
                        borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ fontWeight: 700, color: '#333', marginBottom: '4px' }}>{d.nameCn}</div>
                        <div style={{ color: '#666' }}>年份：{d.x}</div>
                        <div style={{ color: '#666' }}>成熟度：{d.y}/10</div>
                        <div style={{ color: d.color, fontSize: '0.8rem' }}>● {d.phase}</div>
                      </div>
                    )
                  }}
                />

                {/* 技术气泡 - 单一 Scatter，所有14个点 */}
                <Scatter
                  data={scatterData}
                  fill={PHASE_COLORS['trigger']}
                  onClick={(data) => handleBubbleClick(data)}
                  shape={(props: any) => {
                    const { cx = 0, cy = 0, payload } = props
                    if (!payload || !payload.name) return <g />
                    const r = payload.z ? Math.sqrt(payload.z) * 0.8 : 8
                    return (
                      <g>
                        <circle
                          cx={cx} cy={cy} r={r}
                          fill={payload.color}
                          opacity={0.82}
                          stroke={payload.color}
                          strokeWidth={1.5}
                          style={{ cursor: 'pointer' }}
                        />
                        <title>{payload.nameCn}</title>
                      </g>
                    )
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>

            {/* 技术列表 - 气泡颜色标识 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '16px' }}>
              {techData.hypeCycle.technologies.map((tech, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedTech(i)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '16px',
                    border: `1.5px solid ${PHASE_COLORS[tech.phase]}`,
                    background: selectedTech === i ? PHASE_COLORS[tech.phase] + '25' : 'white',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: selectedTech === i ? 600 : 400,
                    color: selectedTech === i ? PHASE_COLORS[tech.phase] : '#555',
                  }}
                >
                  <span style={{ color: PHASE_COLORS[tech.phase], marginRight: '4px' }}>●</span>
                  {tech.nameCn}
                  <span style={{ fontSize: '0.7rem', color: '#999', marginLeft: '4px' }}>
                    {tech.yearEmerging}→{tech.yearPlateau}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* 技术详情 */}
      <section className="card">
        <h2>🔍 技术深度解析</h2>
        {/* 技术选择Tab */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
          {techData.technologyDetail.map((tech, i) => (
            <button
              key={i}
              onClick={() => setSelectedTech(i)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                border: selectedTech === i ? '2px solid #667eea' : '2px solid #e0e0e0',
                background: selectedTech === i ? '#eef2ff' : 'white',
                color: selectedTech === i ? '#667eea' : '#666',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: selectedTech === i ? 600 : 400,
              }}
            >
              {tech.nameCn}
            </button>
          ))}
        </div>

        {currentTech && (
          <>
            <div style={{
              padding: '20px', background: '#f8f9fa', borderRadius: '12px',
              borderLeft: '4px solid #667eea', marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#333' }}>{currentTech.nameCn}</h3>
                <span style={{
                  padding: '4px 12px', background: '#e3f2fd', color: '#1976d2',
                  borderRadius: '20px', fontSize: '0.8rem'
                }}>{currentTech.category}</span>
                <span style={{
                  padding: '4px 12px', background: '#fff3e0', color: '#e65100',
                  borderRadius: '20px', fontSize: '0.8rem'
                }}>
                  成熟度 {currentTech.maturityLevel}/9
                </span>
              </div>
              <p style={{ color: '#555', lineHeight: 1.7, margin: 0 }}>{currentTech.currentStatus}</p>
            </div>

            {/* 主流技术路线 */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '1rem', color: '#333', marginBottom: '12px' }}>🔧 主流技术路线</h4>
              <div>
                {currentTech.mainstreamRoutes.map((route, i) => (
                  <div key={i} style={{
                    padding: '12px 16px',
                    background: i % 2 === 0 ? '#fafafa' : 'white',
                    borderRadius: '8px', marginBottom: '8px',
                    display: 'flex', gap: '12px', alignItems: 'flex-start'
                  }}>
                    <span style={{ fontWeight: 700, color: '#667eea', minWidth: '20px' }}>{i + 1}.</span>
                    <span style={{ color: '#555', lineHeight: 1.6 }}>{route}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 主要厂商分析 */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '1rem', color: '#333', marginBottom: '12px' }}>🏭 主要厂商技术路线对比</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {Object.entries(currentTech.vendorAnalysis).map(([vendor, analysis]) => (
                  <div key={vendor} style={{
                    padding: '14px', background: '#f8f9fa', borderRadius: '8px',
                    borderTop: '2px solid #667eea'
                  }}>
                    <div style={{ fontWeight: 700, color: '#333', marginBottom: '6px' }}>{vendor}</div>
                    <div style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.6 }}>{analysis as string}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 主流发展方向 */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '1rem', color: '#333', marginBottom: '12px' }}>🚀 主流发展方向</h4>
              <div style={{ padding: '14px', background: '#e8f5e9', borderRadius: '8px' }}>
                <p style={{ color: '#2e7d32', margin: 0, lineHeight: 1.7 }}>{currentTech.developmentDirection}</p>
              </div>
            </div>

            {/* 技术难点 */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '1rem', color: '#333', marginBottom: '12px' }}>⚠️ 技术难点与挑战</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentTech.challenges.map((ch, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#e53935', fontWeight: 700 }}>●</span>
                    <span style={{ color: '#555', lineHeight: 1.6 }}>{ch}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 商用时间线 */}
            <div>
              <h4 style={{ fontSize: '1rem', color: '#333', marginBottom: '12px' }}>⏰ 商用时间线预测</h4>
              <div style={{ padding: '14px', background: '#e3f2fd', borderRadius: '8px' }}>
                <p style={{ color: '#1565c0', margin: 0, fontWeight: 500 }}>{currentTech.timeline}</p>
              </div>
            </div>
          </>
        )}
      </section>

      {/* 分类总览 */}
      <section className="card">
        <h2>📋 技术分类总览</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '14px' }}>
          {techData.categorySummary.map((cat, i) => (
            <div key={i} style={{
              padding: '16px', background: '#f8f9fa', borderRadius: '10px',
              borderLeft: '3px solid #667eea'
            }}>
              <div style={{ fontWeight: 700, color: '#333', marginBottom: '6px' }}>{cat.nameCn}</div>
              <div style={{ fontSize: '0.85rem', color: '#666', lineHeight: 1.6, marginBottom: '8px' }}>
                {cat.description}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#999' }}>
                <span style={{ fontWeight: 600 }}>代表厂商：</span>{cat.keyPlayers}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}