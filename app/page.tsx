'use client'
import analysisOutputRaw from '@/app/_data/analysis-output.json'

const analysisOutput: any = analysisOutputRaw

export default function Home() {
  if (!analysisOutput || !analysisOutput.dimensions) {
    return (
      <div className="container">
        <header className="header">
          <h1>📡 天线行业情报追踪</h1>
          <p>四维交叉分析加载中...</p>
        </header>
        <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
          暂无分析数据，请稍后再试。
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <h1>📡 天线行业情报追踪</h1>
        <p>四维交叉分析 · 技术 · 质量 · 成本 · 交付</p>
        <p className="update-info">分析生成时间：{analysisOutput.generatedAt}</p>
      </header>

      {/* === 四维交叉分析 === */}
      <section className="card">
        <h2 className="text-lg sm:text-xl font-semibold mb-2">⭐ 四维交叉分析</h2>
        <p style={{ fontSize: '12px', color: '#999', marginBottom: '16px' }}>生成时间：{analysisOutput.generatedAt}</p>

        {/* 综合分析 */}
        {analysisOutput.crossDimensionSummary && (
          <div style={{
            padding: '16px', borderRadius: '8px', marginBottom: '20px',
            background: 'linear-gradient(135deg, #f8f0ff 0%, #f0f7ff 100%)',
            border: '1px solid #e0d4f5'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#667eea' }}>综合分析</div>
            <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#444', whiteSpace: 'pre-wrap' }}>
              {typeof analysisOutput.crossDimensionSummary === 'string' ? analysisOutput.crossDimensionSummary : JSON.stringify(analysisOutput.crossDimensionSummary)}
            </div>
          </div>
        )}

        {/* 四维卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {(['technology', 'quality', 'cost', 'delivery'] as string[]).map(dim => {
            const cards = analysisOutput.dimensions[dim]?.cards || []
            const icons: Record<string, string> = { technology: '🔧', quality: '📋', cost: '💰', delivery: '🚚' }
            const labels: Record<string, string> = { technology: '技术', quality: '质量', cost: '成本', delivery: '交付' }
            const bgColors: Record<string, string> = { technology: '#f8f0ff', quality: '#f0f7ff', cost: '#fff8f0', delivery: '#f0fff4' }
            return (
              <div key={dim} style={{
                padding: '14px', borderRadius: '8px',
                background: bgColors[dim] || '#fafafa',
                border: '1px solid #eee',
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {icons[dim]} {labels[dim]} <span style={{ fontSize: '12px', color: '#999', fontWeight: 400 }}>({cards.length}条)</span>
                </div>
                {cards.map((card: any, idx: number) => {
                  const sevColors: Record<string, string> = { high: '#e53935', medium: '#ff9800', low: '#43a047' }
                  const sevLabels: Record<string, string> = { high: '高', medium: '中', low: '低' }
                  return (
                    <div key={idx} style={{
                      padding: '8px 10px', marginBottom: '6px',
                      borderRadius: '6px', background: 'rgba(255,255,255,0.7)',
                      borderLeft: `3px solid ${sevColors[card.severity] || '#999'}`,
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '3px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{card.title}</span>
                        <span style={{ fontSize: '11px', color: sevColors[card.severity], fontWeight: 500 }}>
                          {sevLabels[card.severity] || card.severity}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', lineHeight: '1.5', color: '#555' }}>
                        {card.summary}
                      </div>
                      {card.recommendation && (
                        <div style={{ fontSize: '11px', lineHeight: '1.4', color: '#888', marginTop: '4px' }}>
                          💡 {card.recommendation}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>天线行业情报追踪系统 · 数据持续更新中</p>
      </footer>
    </div>
  )
}
