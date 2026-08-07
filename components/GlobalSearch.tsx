'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

// 模块配置
const MODULES = [
  { key: 'news', name: '行业动态', path: '/news', color: '#667eea' },
  { key: 'market', name: '市场', path: '/market', color: '#00C49F' },
  { key: 'companies', name: '企业', path: '/companies', color: '#FFBB28' },
  { key: 'prices', name: '价格', path: '/prices', color: '#FF8042' },
  { key: 'standards', name: '标准', path: '/standards', color: '#9966FF' },
  { key: 'technology', name: '技术', path: '/technology', color: '#FF6699' },
  { key: 'knowledge-graph', name: '知识图谱', path: '/knowledge-graph', color: '#A855F7' },
]

// 数据项接口
interface SearchItem {
  id: string
  title: string
  summary?: string
  content?: string
  module: string
  moduleName: string
  path: string
  extra?: string
}

// 搜索结果分组
interface GroupedResults {
  module: string
  moduleName: string
  moduleColor: string
  path: string
  items: SearchItem[]
}

// 模糊匹配函数
function fuzzyMatch(text: string, query: string): boolean {
  if (!text || !query) return false
  const textLower = text.toLowerCase()
  const queryLower = query.toLowerCase()

  // 完全匹配优先
  if (textLower.includes(queryLower)) return true

  // 简单模糊匹配：检查query中每个字符是否按顺序出现在text中
  let textIndex = 0
  for (const char of queryLower) {
    const found = textLower.indexOf(char, textIndex)
    if (found === -1) return false
    textIndex = found + 1
  }
  return true
}

// 提取搜索文本（从任意数据结构中提取可搜索的文本）
function extractSearchableText(data: unknown, module: string): string[] {
  const texts: string[] = []

  function extract(obj: unknown) {
    if (!obj || typeof obj !== 'object') return

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (
        typeof value === 'string' &&
        value.length > 2 &&
        value.length < 500 &&
        !key.includes('url') &&
        !key.includes('link') &&
        !key.includes('icon') &&
        !key.includes('color')
      ) {
        texts.push(value)
      } else if (Array.isArray(value)) {
        value.forEach(item => extract(item))
      } else if (typeof value === 'object' && value !== null) {
        extract(value)
      }
    }
  }

  extract(data)
  return texts
}

// 解析不同模块的数据，提取可搜索项
function parseModuleData(data: unknown, moduleKey: string, moduleName: string, modulePath: string): SearchItem[] {
  const items: SearchItem[] = []

  // news: JSON 是数组 [{id, title, summary, tags, source, date}, ...]
  if (moduleKey === 'news' && Array.isArray(data)) {
    data.forEach((item) => {
      if (item.title) {
        items.push({
          id: `${moduleKey}-${item.id}`,
          title: item.title,
          summary: item.summary || '',
          module: moduleKey,
          moduleName,
          path: modulePath,
          extra: item.tags?.join(', ') || item.source || ''
        })
      }
    })
  } else if (moduleKey === 'news' && typeof data === 'object' && data !== null && !Array.isArray(data)) {
    Object.values(data as Record<string, { id?: number; title?: string; summary?: string; tags?: string[] }>).forEach((item) => {
      if (item.title) {
        items.push({
          id: `${moduleKey}-${item.id}`,
          title: item.title,
          summary: item.summary,
          module: moduleKey,
          moduleName,
          path: modulePath,
          extra: item.tags?.join(', ')
        })
      }
    })
  } else if (moduleKey === 'market' && typeof data === 'object') {
    const marketData = data as { segments?: Array<{ name?: string; drivers?: string[] }>; keyDrivers?: string[] }
    if (marketData.segments) {
      marketData.segments.forEach((seg, idx) => {
        const searchableText = [
          seg.name,
          ...(seg.drivers || [])
        ].filter(Boolean).join(' ')
        items.push({
          id: `${moduleKey}-segment-${idx}`,
          title: seg.name || '',
          content: searchableText,
          module: moduleKey,
          moduleName,
          path: modulePath
        })
      })
    }
    if (marketData.keyDrivers) {
      marketData.keyDrivers.forEach((driver, idx) => {
        items.push({
          id: `${moduleKey}-driver-${idx}`,
          title: driver,
          module: moduleKey,
          moduleName,
          path: modulePath
        })
      })
    }
  } else if (moduleKey === 'companies' && typeof data === 'object') {
    const companiesData = data as {
      supplyChain?: Record<string, {
        name?: string;
        description?: string;
        companies?: Array<{
          id?: string;
          name?: string;
          nameEn?: string;
          position?: string;
          highlights?: string[];
          role?: string;
        }>;
      }>;
    };
    if (companiesData.supplyChain) {
      const tierOrder = Object.keys(companiesData.supplyChain)
      tierOrder.forEach(tierKey => {
        const tier = companiesData.supplyChain?.[tierKey]
        if (tier?.companies) {
          tier.companies.forEach((company, idx) => {
            if (company.name) {
              items.push({
                id: `${moduleKey}-${tierKey}-${idx}`,
                title: company.name,
                summary: company.position || company.role,
                content: company.highlights?.join(', '),
                module: moduleKey,
                moduleName,
                path: modulePath
              })
            }
          })
        }
      })
    }
  } else if (moduleKey === 'prices' && typeof data === 'object') {
    const pricesData = data as { categories?: Array<{ name?: string; materials?: Array<{ name?: string; impact?: string; trend?: string }> }> }
    if (pricesData.categories) {
      pricesData.categories.forEach(cat => {
        if (cat.materials) {
          cat.materials.forEach((mat, idx) => {
            items.push({
              id: `${moduleKey}-${idx}`,
              title: mat.name ?? '',
              summary: mat.impact ?? '',
              extra: mat.trend,
              module: moduleKey,
              moduleName,
              path: modulePath
            })
          })
        }
      })
    }
  } else if (moduleKey === 'standards' && typeof data === 'object') {
    const standardsData = data as { categories?: Array<{ standards?: Array<{ name?: string; title?: string; description?: string }> }> }
    if (standardsData.categories) {
      standardsData.categories.forEach(cat => {
        if (cat.standards) {
          cat.standards.forEach((std, idx) => {
            items.push({
              id: `${moduleKey}-${idx}`,
              title: std.name ?? '',
              summary: std.title ?? '',
              content: std.description ?? '',
              module: moduleKey,
              moduleName,
              path: modulePath
            })
          })
        }
      })
    }
  } else if (moduleKey === 'technology' && typeof data === 'object') {
    // technology.json: { ..., technologyDetail: [...] }
    const techData = data as {
      technologyDetail?: Array<{
        name?: string;
        nameCn?: string;
        currentStatus?: string;
        phase?: string;
        trl?: number;
      }>;
    }
    if (techData.technologyDetail) {
      techData.technologyDetail.forEach((tech, idx) => {
        items.push({
          id: `${moduleKey}-${idx}`,
          title: tech.nameCn || tech.name || '',
          summary: tech.currentStatus,
          extra: tech.phase ? `TRL ${tech.trl}` : undefined,
          module: moduleKey,
          moduleName,
          path: modulePath
        })
      })
    }
  } else if (moduleKey === 'knowledge-graph' && typeof data === 'object') {
    // knowledge-graph.json: { nodes: [{id, name, type, oneLiner, tags}] }
    const kgData = data as { nodes?: Array<{
      id?: string;
      name?: string;
      nameEn?: string;
      type?: string;
      oneLiner?: string;
      tags?: string[];
      category?: string;
    }> };
    if (kgData.nodes) {
      kgData.nodes.forEach((node, idx) => {
        if (node.name && node.id) {
          items.push({
            id: `${moduleKey}-${node.id}`,
            title: node.name,
            summary: node.oneLiner || '',
            content: node.tags?.join(', ') || '',
            module: moduleKey,
            moduleName,
            path: `${modulePath}#${encodeURIComponent(node.id)}`,
            extra: node.type || node.category
          })
        }
      })
    }
  }

  return items
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [allItems, setAllItems] = useState<SearchItem[]>([])
  const [results, setResults] = useState<GroupedResults[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // 加载所有数据
  const loadAllData = useCallback(async () => {
    setIsLoading(true)
    const items: SearchItem[] = []

    try {
      const dataFiles = ['market', 'news', 'companies', 'prices', 'standards', 'technology', 'knowledge-graph']

      await Promise.all(
        dataFiles.map(async (moduleKey) => {
          try {
            const response = await fetch(`/antenna-tracker/data/${moduleKey}.json`)
            if (response.ok) {
              const data = await response.json()
              const module = MODULES.find(m => m.key === moduleKey)
              if (module) {
                const parsed = parseModuleData(data, moduleKey, module.name, module.path)
                items.push(...parsed)
              }
            }
          } catch (error) {
            console.error(`Failed to load ${moduleKey}.json:`, error)
          }
        })
      )

      setAllItems(items)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 初始化加载数据
  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // 搜索逻辑
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setSelectedIndex(-1)
      return
    }

    const matchedItems = allItems.filter(item => {
      const searchFields = [
        item.title,
        item.summary,
        item.content,
        item.extra
      ].filter(Boolean)

      return searchFields.some(field => fuzzyMatch(field!, query))
    })

    // 按模块分组
    const grouped: Record<string, GroupedResults> = {}
    matchedItems.forEach(item => {
      if (!grouped[item.module]) {
        const moduleConfig = MODULES.find(m => m.key === item.module)
        if (moduleConfig) {
          grouped[item.module] = {
            module: item.module,
            moduleName: item.moduleName,
            moduleColor: moduleConfig.color,
            path: item.path,
            items: []
          }
        }
      }
      if (grouped[item.module]) {
        grouped[item.module].items.push(item)
      }
    })

    const groupedResults = Object.values(grouped)
    setResults(groupedResults)

    // 重置选中状态
    setSelectedIndex(-1)
  }, [query, allItems])

  // 监听自定义事件唤起搜索（来自 SearchTrigger 按钮）
  useEffect(() => {
    const handleOpenSearch = () => {
      setIsOpen(true)
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 100)
    }

    document.addEventListener('openGlobalSearch', handleOpenSearch)
    return () => document.removeEventListener('openGlobalSearch', handleOpenSearch)
  }, [])

  // "/" 快捷键唤起搜索
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果在输入框中按 "/" 则不触发
      if (e.key === '/' && !isOpen) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

        e.preventDefault()
        setIsOpen(true)
        setQuery('')
        setTimeout(() => inputRef.current?.focus(), 100)
      }

      // ESC 关闭搜索
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setQuery('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target as Node)) {
        // 如果点击的不是搜索框本身，不关闭
      }
    }

    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  // 键盘导航
  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (!results.length) return

    const totalItems = results.reduce((sum, g) => sum + g.items.length, 0)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % totalItems)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const flatItems = results.flatMap(g => g.items)
      if (flatItems[selectedIndex]) {
        window.location.href = flatItems[selectedIndex].path
      }
    }
  }

  // 渲染搜索结果
  const renderResults = () => {
    const flatItems = results.flatMap(g => g.items)
    
    return (
      <div className="global-search-results" ref={resultsRef}>
        {results.map(group => (
          <div key={group.module} className="search-group">
            <div className="search-group-header" style={{ borderColor: group.moduleColor }}>
              <span>{group.moduleName}</span>
              <span className="search-count">{group.items.length}</span>
            </div>
            <ul className="search-items">
              {group.items.map((item, idx) => (
                <li
                  key={item.id}
                  className={`search-item ${selectedIndex === idx ? 'active' : ''}`}
                  onClick={() => window.location.href = item.path}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="search-item-title">{item.title}</div>
                  {item.summary && (
                    <div className="search-item-summary">{item.summary}</div>
                  )}
                  {item.content && (
                    <div className="search-item-content">{item.content}</div>
                  )}
                  {item.extra && (
                    <div className="search-item-extra">{item.extra}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        
        {results.length === 0 && (
          <div className="search-empty">
            未找到相关结果
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* 搜索面板 - 触发按钮由 Navbar 中的 SearchTrigger 组件提供 */}
      {isOpen && (
        <div className="global-search-panel">
          <div className="search-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyNavigation}
              placeholder="搜索新闻、企业、技术..."
              autoFocus
            />
            <button
              className="search-close"
              onClick={() => {
                setIsOpen(false)
                setQuery('')
              }}
            >
              ×
            </button>
          </div>

          {isLoading ? (
            <div className="search-loading">加载中...</div>
          ) : (
            renderResults()
          )}
        </div>
      )}

      <style jsx>{`
        .global-search-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 14px;
          color: #64748b;
          transition: all 0.2s;
        }

        .global-search-trigger:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }

        .global-search-trigger kbd {
          margin-left: auto;
          padding: 2px 6px;
          font-size: 11px;
          background: #f1f5f9;
          border-radius: 4px;
          color: #94a3b8;
        }

        .global-search-panel {
          position: fixed;
          top: 60px;
          left: 50%;
          transform: translateX(-50%);
          width: 600px;
          max-height: 500px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          overflow: hidden;
        }

        .search-input-wrapper {
          display: flex;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .search-input-wrapper input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 16px;
          color: #1e293b;
        }

        .search-input-wrapper input::placeholder {
          color: #94a3b8;
        }

        .search-close {
          background: none;
          border: none;
          font-size: 24px;
          color: #94a3b8;
          cursor: pointer;
          padding: 0 4px;
        }

        .search-group {
          border-bottom: 1px solid #f1f5f9;
        }

        .search-group-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px 4px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          border-bottom: 2px solid;
        }

        .search-count {
          background: #f1f5f9;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 500;
        }

        .search-items {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .search-item {
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.15s;
          border-bottom: 1px solid #f8fafc;
        }

        .search-item:last-child {
          border-bottom: none;
        }

        .search-item:hover,
        .search-item.active {
          background: #f8fafc;
        }

        .search-item-title {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 4px;
        }

        .search-item-summary {
          font-size: 13px;
          color: #64748b;
          line-height: 1.5;
          margin-bottom: 4px;
        }

        .search-item-content {
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.4;
          margin-bottom: 4px;
        }

        .search-item-extra {
          font-size: 11px;
          color: #a855f7;
          font-weight: 500;
        }

        .search-empty {
          padding: 40px;
          text-align: center;
          color: #94a3b8;
          font-size: 14px;
        }

        .search-loading {
          padding: 40px;
          text-align: center;
          color: #94a3b8;
          font-size: 14px;
        }
      `}</style>
    </>
  )
}
