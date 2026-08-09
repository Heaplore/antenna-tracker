'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import * as d3 from 'd3'
import kgDataRaw from '@/app/_data/knowledge-graph.json'

// ===== 类型定义 =====

type NodeType = 'technology' | 'metric' | 'component' | 'material' | 'report'

interface KGNode {
  id: string
  name: string
  nameEn: string
  type: NodeType
  filename: string
  tags: string[]
  createdAt: string
  updatedAt: string
  oneLiner: string
  analogy: string
  outgoing: { targetId: string; label: string }[]
}

interface KGLink {
  source: string
  target: string
  type: string
}

interface SimNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  type: NodeType
  oneLiner: string
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: string | SimNode
  target: string | SimNode
}

const kgData = kgDataRaw as {
  lastUpdate: string
  totalNotes: number
  stats: Record<NodeType, number>
  nodes: KGNode[]
  links: KGLink[]
}

// ===== 视觉配置 =====

const TYPE_COLORS: Record<NodeType, string> = {
  technology: '#6366f1',   // 靛蓝
  metric: '#10b981',       // 翠绿
  component: '#f59e0b',    // 琥珀
  material: '#ef4444',     // 朱红
  report: '#8b5cf6',        // 紫罗兰
}

const TYPE_LABELS: Record<NodeType, string> = {
  technology: '技术概念',
  metric: '指标术语',
  component: '零部件',
  material: '材料',
  report: '报告',
}

const TYPE_ICONS: Record<NodeType, string> = {
  technology: '◆',
  metric: '○',
  component: '▣',
  material: '⬡',
  report: '📄',
}

// Obsidian 风格：小圆点，文字随缩放/悬停/选中显示
const MIN_NODE_RADIUS = 2
const MAX_NODE_RADIUS = 5
const CENTER_RADIUS = 6              // 中心节点半径
const LABEL_ZOOM_THRESHOLD = 1.4     // 放大到多少倍才显示全部文字
const ICON_ZOOM_THRESHOLD = 2.2      // 图标（符号）放大到多少倍才显示
const COLLIDE_PADDING = 2            // 碰撞力额外间距

// ===== 页面 =====

export default function KnowledgeGraphPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTypes, setActiveTypes] = useState<Set<NodeType>>(
    new Set<NodeType>(['technology', 'metric', 'component', 'material', 'report']),
  )
  const svgRef = useRef<SVGSVGElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const simulationRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const zoomScaleRef = useRef(1)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIdx, setHighlightedIdx] = useState(-1)
  const focusRef = useRef<{ selectedId: string | null; hoveredId: string | null }>({
    selectedId: null,
    hoveredId: null,
  })
  const [containerSize, setContainerSize] = useState({ w: 1200, h: 800 })

  // ===== 搜索建议（下拉候选） =====

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return kgData.nodes
      .filter((n) => activeTypes.has(n.type))
      .filter((n) => n.name.toLowerCase().includes(q))
      .slice(0, 10)
  }, [searchQuery, activeTypes])

  // ===== 过滤后数据 =====

  // 注意：filtered 只按搜索过滤，**不按类型** —— 类型筛选走独立的 display 显隐
  // effect（见 typeVisibilityEffect），避免筛选时重建整个力导向布局导致 iframe 连接重置。
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const nodes = kgData.nodes.filter((n) => {
      if (!q) return true
      return (
        n.name.toLowerCase().includes(q) ||
        (n.nameEn && n.nameEn.toLowerCase().includes(q)) ||
        n.tags.some((t) => t.toLowerCase().includes(q)) ||
        n.oneLiner.toLowerCase().includes(q)
      )
    })
    const ids = new Set(nodes.map((n) => n.id))
    // d3.forceLink 会原地把 links 的 source/target 从字符串改成节点对象，
    // 所以兼容两种形态（与 RelatedNotesPanel 同款 idOf 处理）
    const idOf = (x: any) => (typeof x === 'string' ? x : x?.id)
    const links = kgData.links.filter(
      (l) => ids.has(idOf(l.source)) && ids.has(idOf(l.target)),
    )
    return { nodes, links }
  }, [searchQuery])

  // header 计数：activeTypes 过滤后的可见节点/关系数（纯计算，不触发重建）
  const visibleCount = useMemo(() => {
    const idOf = (x: any) => (typeof x === 'string' ? x : x?.id)
    const nodes = kgData.nodes.filter((n) => activeTypes.has(n.type))
    const ids = new Set(nodes.map((n) => n.id))
    const links = kgData.links.filter(
      (l) => ids.has(idOf(l.source)) && ids.has(idOf(l.target)),
    )
    return { nodes: nodes.length, links: links.length }
  }, [activeTypes])

  // ===== 类型筛选显隐 effect：只切 display，不重建图谱 =====
  // 节点按 type 显隐；连线两端任一隐藏则隐藏。不触发 forceSimulation 重建，
  // 因此不打断 iframe 卡片连接、不重置节点位置。
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const idOf = (x: any) => (typeof x === 'string' ? x : x?.id)
    const typeOf = new Map<string, NodeType>()
    for (const n of kgData.nodes) typeOf.set(n.id, n.type)
    d3.select(svg)
      .selectAll<SVGGElement, SimNode>('g.node')
      .attr('display', (d: any) => (activeTypes.has(d.type) ? null : 'none'))
    d3.select(svg)
      .selectAll<SVGLineElement, SimLink>('line')
      .attr('display', (l: any) => {
        const st = typeOf.get(idOf(l.source))
        const tt = typeOf.get(idOf(l.target))
        return st && tt && activeTypes.has(st) && activeTypes.has(tt) ? null : 'none'
      })
  }, [activeTypes, filtered])

  // ===== 选中节点 =====
  const selectedNode = useMemo(
    () => kgData.nodes.find((n) => n.id === selectedId) || null,
    [selectedId],
  )

  // ===== Obsidian 风格圆形布局渲染 =====
  useEffect(() => {    const svg = svgRef.current
    const container = containerRef.current
    if (!svg || !container) return

    const rect = container.getBoundingClientRect()
    const W = rect.width || 1200
    const H = rect.height || 800
    setContainerSize({ w: W, h: H })

    const g = d3.select(svg).select('g')
    const isFirstRender = !g || g.empty()

    if (isFirstRender) {
      // ===== 首次渲染：创建整个 SVG =====
      d3.select(svg).selectAll('*').remove()
      const rootG = d3
        .select(svg)
        .attr('viewBox', `0 0 ${W} ${H}`)
        .append('g')

      // zoom/pan
      const updateVisibility = () => {
        const k = zoomScaleRef.current
        const { selectedId: sel, hoveredId: hov } = focusRef.current
        const focus = sel || hov
        rootG.selectAll('text.node-label').attr('opacity', (d: any) => {
          if (focus) return null
          return k >= LABEL_ZOOM_THRESHOLD ? 0.9 : 0
        })
      }

      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 5])
        .on('zoom', (event) => {
          rootG.attr('transform', event.transform.toString())
          zoomScaleRef.current = event.transform.k
          updateVisibility()
        })
      zoomRef.current = zoom
      d3.select(svg).call(zoom)

      // Build node map with degree calculation
      const nodeMap = new Map<string, any>()
      filtered.nodes.forEach((n) => {
        nodeMap.set(n.id, { ...n, degree: 0 })
      })
      filtered.links.forEach((l) => {
        const src = typeof l.source === 'string' ? l.source : (l.source as any).id
        const tgt = typeof l.target === 'string' ? l.target : (l.target as any).id
        if (nodeMap.has(src)) nodeMap.get(src).degree++
        if (nodeMap.has(tgt)) nodeMap.get(tgt).degree++
      })

      const nodes = Array.from(nodeMap.values())
      if (nodes.length === 0) return

      const centerNode = nodes.reduce((a, b) => (a.degree > b.degree ? a : b))
      const maxDegree = Math.max(...nodes.map((n) => n.degree), 1)
      const minDegree = Math.min(...nodes.map((n) => n.degree), 1)
      const getNodeRadius = (node: any) => {
        const normalized =
          minDegree === maxDegree ? 0.5 : (node.degree - minDegree) / (maxDegree - minDegree)
        return MIN_NODE_RADIUS + normalized * (MAX_NODE_RADIUS - MIN_NODE_RADIUS)
      }

      // Random initial positions near center
      const centerX = W / 2
      const centerY = H / 2
      nodes.forEach((n) => {
        n.x = centerX + (Math.random() - 0.5) * 60
        n.y = centerY + (Math.random() - 0.5) * 60
      })

      const simulation = d3
        .forceSimulation(nodes as any)
        .force(
          'link',
          d3
            .forceLink(filtered.links as any)
            .id((d: any) => d.id)
            .distance(50)
            .strength(0.6),
        )
        .force('charge', d3.forceManyBody().strength(-150).distanceMax(350))
        .force('center', d3.forceCenter(centerX, centerY))
        .force(
          'collide',
          d3
            .forceCollide()
            .radius((d: any) => getNodeRadius(d) + COLLIDE_PADDING)
            .strength(0.8),
        )
        .force(
          'radial',
          d3
            .forceRadial(
              (d: any) => {
                const normalized =
                  minDegree === maxDegree ? 0.5 : (d.degree - minDegree) / (maxDegree - minDegree)
                return 60 + (1 - normalized) * 220
              },
              centerX,
              centerY,
            )
            .strength(0.25),
        )
        .alphaDecay(0.02)
        .velocityDecay(0.25)
      simulationRef.current = simulation as any

      // Links
      const linkSel = rootG
        .append('g')
        .attr('class', 'links')
        .selectAll('line')
        .data(filtered.links)
        .join('line')
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 0.6)
        .attr('stroke-opacity', 0.2)

      // Nodes
      const nodeSel = rootG
        .append('g')
        .attr('class', 'nodes')
        .selectAll<SVGGElement, any>('g')
        .data(nodes, (d: any) => d.id)
        .join('g')
        .attr('class', 'node')
        .style('cursor', 'pointer')
        .on('mouseover', (_, d) => setHoveredId(d.id))
        .on('mouseout', () => setHoveredId(null))

      // Drag behavior
      const drag = d3
        .drag<SVGGElement, any>()
        .clickDistance(4)
        .on('start', function (event, d) {
          d3.select(this).raise()
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', function (event, d) {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', function (event, d) {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null
          d.fy = null
          const dx = event.x - d.x
          const dy = event.y - d.y
          if (Math.sqrt(dx * dx + dy * dy) < 4) {
            setSelectedId(d.id)
          }
        })
      nodeSel.call(drag as any)
      nodeSel.on('click', (_, d) => setSelectedId(d.id))

      const isCenter = (node: any) => node.id === centerNode.id

      nodeSel
        .append('circle')
        .attr('r', (d) => getNodeRadius(d))
        .attr('fill', (d) => (isCenter(d) ? '#4f46e5' : TYPE_COLORS[(d as any).type as NodeType]))
        .attr('stroke', '#fff')
        .attr('stroke-width', (d) => (isCenter(d) ? 1.5 : 1))
        .attr('opacity', 0.95)

      nodeSel
        .append('text')
        .attr('class', 'node-label')
        .attr('text-anchor', 'middle')
        .attr('dy', (d) => getNodeRadius(d) + 8)
        .attr('font-size', 6.5)
        .attr('fill', '#374151')
        .attr('pointer-events', 'none')
        .attr('font-weight', 400)
        .attr('opacity', 0)
        .text((d) => {
          const name = d.name.length > 14 ? d.name.slice(0, 14) + '…' : d.name
          return name
        })

      simulation.on('tick', () => {
        nodeSel.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
        linkSel
          .attr('x1', (d: any) => (d.source as any).x)
          .attr('y1', (d: any) => (d.source as any).y)
          .attr('x2', (d: any) => (d.target as any).x)
          .attr('y2', (d: any) => (d.target as any).y)
      })

      // Store refs for subsequent updates
      // 注意：必须存到 DOM 节点 (rootG.node()) 而非 d3 selection 对象——
      // 每次 useEffect 运行时 d3.select(svg).select('g') 会创建新 selection，
      // 旧 selection 上的属性读不到，导致 else 分支提前 return、节点永不更新。
      const rootNode = rootG.node() as any
      rootNode._linkSel = linkSel
      rootNode._nodeSel = nodeSel
      rootNode._getNodeRadius = getNodeRadius
      rootNode._simulation = simulation
      rootNode._centerX = centerX
      rootNode._centerY = centerY
      rootNode._updateVisibility = updateVisibility
    } else {
      // ===== 后续更新：重新跑力导向布局（非重建） =====
      const existingG = g
      // 确保 .links / .nodes 容器存在（StrictMode 双调用或异常后可能缺失，
      // 缺失时 selectAll 的 parentNode 为 null，join 会报 insertBefore null）
      let linksG = existingG.select('.links') as any
      let nodesG = existingG.select('.nodes') as any
      if (linksG.empty()) linksG = existingG.append('g').attr('class', 'links')
      if (nodesG.empty()) nodesG = existingG.append('g').attr('class', 'nodes')
      const linkSel = linksG.selectAll('line')
      let nodeSel = nodesG.selectAll('g.node')
      // 从 DOM 节点读取（首次渲染时存到 rootG.node() 上）
      const existingNode = existingG.node() as any
      const sim = existingNode?._simulation as d3.Simulation<any, any> | undefined
      const getNodeRadius = existingNode?._getNodeRadius as ((node: any) => number) | undefined
      
      if (!sim || !getNodeRadius) return

      // Rebuild node map preserving existing positions
      const nodeMap = new Map<string, any>()
      
      // First, preserve existing node positions
      const existingNodes = sim.nodes() as any[]
      const existingPosMap = new Map<string, { x: number; y: number }>()
      existingNodes.forEach((n: any) => {
        if (n.x !== undefined && n.y !== undefined) {
          existingPosMap.set(n.id, { x: n.x, y: n.y })
        }
      })

      // Add new filtered nodes (with preserved or fresh positions)
      filtered.nodes.forEach((n) => {
        const pos = existingPosMap.get(n.id)
        nodeMap.set(n.id, {
          ...n,
          x: pos?.x ?? (W / 2 + (Math.random() - 0.5) * 60),
          y: pos?.y ?? (H / 2 + (Math.random() - 0.5) * 60),
          degree: 0,
        })
      })

      // Recalculate degrees
      filtered.links.forEach((l) => {
        const src = typeof l.source === 'string' ? l.source : (l.source as any).id
        const tgt = typeof l.target === 'string' ? l.target : (l.target as any).id
        if (nodeMap.has(src)) nodeMap.get(src).degree++
        if (nodeMap.has(tgt)) nodeMap.get(tgt).degree++
      })

      const nodes = Array.from(nodeMap.values())
      if (nodes.length === 0) return

      const maxDegree = Math.max(...nodes.map((n) => n.degree), 1)
      const minDegree = Math.min(...nodes.map((n) => n.degree), 1)

      // Update simulation with new nodes
      sim.nodes(nodes as any)
      // forceLink 会原地把 source/target 改成节点对象引用（指向旧的 sim 节点）。
      // 筛选后 sim 节点已换新，旧引用位置错乱 → 必须传入干净的字符串副本，
      // 让 forceLink 基于当前 sim.nodes() 重新解析。
      const freshLinks = filtered.links.map((l: any) => ({
        ...l,
        source: typeof l.source === 'string' ? l.source : (l.source as any).id,
        target: typeof l.target === 'string' ? l.target : (l.target as any).id,
      }))
      sim.force(
        'link',
        d3.forceLink(freshLinks as any).id((d: any) => d.id).distance(50).strength(0.6),
      )
      sim.force(
        'collide',
        d3.forceCollide().radius((d: any) => getNodeRadius(d) + COLLIDE_PADDING).strength(0.8),
      )
      sim.force(
        'radial',
        d3.forceRadial(
          (d: any) => {
            const normalized =
              minDegree === maxDegree ? 0.5 : (d.degree - minDegree) / (maxDegree - minDegree)
            return 60 + (1 - normalized) * 220
          },
          W / 2,
          H / 2,
        ).strength(0.25),
      )

      // Reheat simulation to trigger re-layout
      sim.alpha(0.8).restart()

      // Update links with join
      linkSel
        .data(freshLinks)
        .join('line')
        .attr('stroke', '#94a3b8')
        .attr('stroke-width', 0.6)
        .attr('stroke-opacity', 0.2)

      // Update nodes with join (preserves existing elements, adds/removes as needed)
      let joinedNodes: any
      try {
        joinedNodes = nodeSel
          .data(nodes, (d: any) => d.id)
          .join(
            (enter: any) => {
              const g = enter.append('g').attr('class', 'node').style('cursor', 'pointer')
              g.append('circle')
                .attr('stroke', '#fff')
                .attr('stroke-width', 1)
                .attr('opacity', 0.95)
              g.append('text')
                .attr('class', 'node-label')
                .attr('text-anchor', 'middle')
                .attr('font-size', 6.5)
                .attr('fill', '#374151')
                .attr('pointer-events', 'none')
                .attr('font-weight', 400)
                .attr('opacity', 0)
              return g
            },
            (exit: any) => exit.remove(),
            (update: any) => update,
          ) as any as d3.Selection<SVGGElement, any, any, any>
      } catch {
        // StrictMode 双调用 / 异常后 .nodes 容器 DOM 失效，重建
        nodesG.selectAll('*').remove()
        joinedNodes = nodesG
          .selectAll('g')
          .data(nodes, (d: any) => d.id)
          .join('g')
          .attr('class', 'node')
          .style('cursor', 'pointer')
        joinedNodes.append('circle')
          .attr('stroke', '#fff')
          .attr('stroke-width', 1)
          .attr('opacity', 0.95)
        joinedNodes.append('text')
          .attr('class', 'node-label')
          .attr('text-anchor', 'middle')
          .attr('font-size', 6.5)
          .attr('fill', '#374151')
          .attr('pointer-events', 'none')
          .attr('font-weight', 400)
          .attr('opacity', 0)
        nodeSel = nodesG.selectAll('g.node')
      }
      
      joinedNodes
        .on('mouseover', (_: any, d: any) => setHoveredId(d.id))
        .on('mouseout', () => setHoveredId(null))
        .call(d3.drag<SVGGElement, any>()
          .clickDistance(4)
          .on('start', function (event, d) {
            d3.select(this).raise()
            if (!event.active) sim.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', function (event, d) {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', function (event, d) {
            if (!event.active) sim.alphaTarget(0)
            d.fx = null
            d.fy = null
            const dx = event.x - d.x
            const dy = event.y - d.y
            if (Math.sqrt(dx * dx + dy * dy) < 4) {
              setSelectedId(d.id)
            }
          })
        )
        .on('click', (_: any, d: any) => setSelectedId(d.id))

      // Update circle and label for each node
      nodeSel.each(function (this: any, d: any) {
        const nodeG = d3.select(this)
        nodeG.select('circle')
          .transition().duration(300)
          .attr('r', getNodeRadius(d))
          .attr('fill', TYPE_COLORS[d.type as NodeType])
          .attr('opacity', 0.95)
        nodeG.select('text.node-label')
          .transition().duration(300)
          .attr('dy', getNodeRadius(d) + 8)
          .text(d.name.length > 14 ? d.name.slice(0, 14) + '…' : d.name)
      })

      // Update tick handler
      sim.on('tick', () => {
        nodeSel.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
        linkSel
          .attr('x1', (d: any) => (d.source as any).x)
          .attr('y1', (d: any) => (d.source as any).y)
          .attr('x2', (d: any) => (d.target as any).x)
          .attr('y2', (d: any) => (d.target as any).y)
      })
    }    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered])

  // 同步 focus 状态到 ref，供 zoom/pan 等闭包读取
  useEffect(() => {
    focusRef.current = { selectedId, hoveredId }
  }, [selectedId, hoveredId])

  // ===== 选中/hover 联动：统一处理高亮 + 缩放文字显隐 =====
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const k = zoomScaleRef.current
    const sel = d3.select(svg).selectAll<SVGGElement, SimNode>('g.node')
    const lnk = d3.select(svg).selectAll<SVGLineElement, SimLink>('line')
    const labels = d3.select(svg).selectAll<SVGTextElement, SimNode>('text.node-label')
    const focus = selectedId || hoveredId

    // 标签可见性辅助函数
    const labelOpacity = (d: any) => {
      if (focus && (d.id === focus || neighborSet?.has(d.id))) return 0.95
      if (!focus && k >= LABEL_ZOOM_THRESHOLD) return 0.9
      return 0
    }

    let neighborSet: Set<string> | undefined
    if (focus) {
      neighborSet = new Set([focus])
      const idOf = (x: any) => (typeof x === 'string' ? x : x?.id)
      // 从过滤后的 links 计算邻居（与当前渲染视图一致）
      for (const l of kgData.links) {
        if (idOf(l.source) === focus) neighborSet.add(idOf(l.target) as string)
        if (idOf(l.target) === focus) neighborSet.add(idOf(l.source) as string)
      }
      sel.attr('opacity', (d: any) => (neighborSet!.has(d.id) ? 1 : 0.15))
      labels.attr('opacity', labelOpacity)
      lnk
        .attr('opacity', (l: any) => {
          const s = typeof l.source === 'object' ? l.source.id : l.source
          const t = typeof l.target === 'object' ? l.target.id : l.target
          return s === focus || t === focus ? 1 : 0.04
        })
        .attr('stroke', (l: any) => {
          const s = typeof l.source === 'object' ? l.source.id : l.source
          const t = typeof l.target === 'object' ? l.target.id : l.target
          return s === focus || t === focus ? '#4338ca' : '#cbd5e1'
        })
        .attr('stroke-width', (l: any) => {
          const s = typeof l.source === 'object' ? l.source.id : l.source
          const t = typeof l.target === 'object' ? l.target.id : l.target
          return s === focus || t === focus ? 2.5 : 0.4
        })
    } else {
      sel.attr('opacity', 1)
      labels.attr('opacity', labelOpacity)
      lnk.attr('opacity', 0.2).attr('stroke-width', 0.6).attr('stroke', '#94a3b8')
    }
  }, [selectedId, hoveredId])

  // ===== 容器尺寸响应 =====
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => {
      const r = container.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) {
        setContainerSize({ w: r.width, h: r.height })
      }
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // ===== 抽屉关闭 ESC =====
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ===== iframe 内部关联笔记跳转 → 在 modal 内换内容 + 顶部节点名同步 =====
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const data: any = (e as any).data
      if (!data || data.type !== 'kg-nav') return
      const id = typeof data.id === 'string' ? data.id : ''
      if (!id) return
      // 验证 id 真实存在（避免跳转孤儿/空 KG 节点）
      const exists = kgData.nodes.some((n) => n.id === id)
      if (!exists) return
      setSelectedId(id)
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  const toggleType = (t: NodeType) => {
    const next = new Set(activeTypes)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    if (next.size === 0) return // 至少保留 1 类
    setActiveTypes(next)
  }

  const fitView = () => {
    const svg = svgRef.current
    const zoom = zoomRef.current
    if (!svg || !zoom) return
    d3.select(svg).transition().duration(500).call(zoom.transform, d3.zoomIdentity)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#fafafa', height: '100vh' }}>
      {/* ===== 统一版头 ===== */}
      <header className="header">
        <h1>📡 天线知识图谱</h1>
        <p>{visibleCount.nodes} 节点 / {visibleCount.links} 条关系 · 更新于 {kgData.lastUpdate}</p>
        <p className="update-info">数据来源：内部知识库整理</p>
      </header>

      {/* ===== 工具栏 ===== */}
      <div style={{
        padding: '12px 20px',
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        {/* 搜索框 + 下拉候选 */}
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <input
            type="text"
            placeholder="搜索节点 (名称 / 标签 / 内容)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setShowSuggestions(true)
              setHighlightedIdx(-1)
            }}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true)
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={(e) => {
              if (!showSuggestions || suggestions.length === 0) return
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setHighlightedIdx(prev => Math.min(prev + 1, suggestions.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setHighlightedIdx(prev => Math.max(prev - 1, 0))
              } else if (e.key === 'Enter' && highlightedIdx >= 0) {
                e.preventDefault()
                setSelectedId(suggestions[highlightedIdx].id)
                setShowSuggestions(false)
              } else if (e.key === 'Escape') {
                setShowSuggestions(false)
              }
            }}
            style={{
              flex: 1,
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13,
              outline: 'none',
            }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 4,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 100,
              maxHeight: 280,
              overflowY: 'auto',
            }}>
              {suggestions.map((node, idx) => (
                <button
                  key={node.id}
                  onClick={() => {
                    setSelectedId(node.id)
                    setShowSuggestions(false)
                  }}
                  onMouseEnter={() => setHighlightedIdx(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 12px',
                    background: idx === highlightedIdx ? '#f0f4ff' : '#fff',
                    border: 'none',
                    borderBottom: idx < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: 13,
                    color: '#111827',
                    transition: 'background 0.1s',
                  }}
                >
                  <span style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: TYPE_COLORS[node.type],
                    flexShrink: 0,
                  }} />
                  <span style={{ fontWeight: 600, flexShrink: 0 }}>{node.name}</span>
                  {node.nameEn && <span style={{ color: '#9ca3af', fontSize: 11, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.nameEn}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* 类型筛选 */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(Object.keys(TYPE_LABELS) as NodeType[]).map((t) => {
            const on = activeTypes.has(t)
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  border: `1px solid ${on ? TYPE_COLORS[t] : '#e5e7eb'}`,
                  background: on ? TYPE_COLORS[t] : '#fff',
                  color: on ? '#fff' : '#6b7280',
                  borderRadius: 14,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>{TYPE_ICONS[t]}</span>
                {TYPE_LABELS[t]}({kgData.stats[t]})
              </button>
            )
          })}
          <button
            onClick={fitView}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              border: '1px solid #e5e7eb',
              background: '#fff',
              color: '#374151',
              borderRadius: 14,
              cursor: 'pointer',
            }}
          >
            ↺ 复位
          </button>
        </div>
        </div>

      {/* ===== 图谱区 ===== */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', overflow: 'hidden' }}
      >
        <svg
          ref={svgRef}
          width={containerSize.w}
          height={containerSize.h}
          style={{ display: 'block', background: '#f9fafb' }}
        />

        {/* 图例 */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 11,
            color: '#4b5563',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#111827' }}>图例</div>
          {(Object.keys(TYPE_LABELS) as NodeType[]).map((t) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: TYPE_COLORS[t],
                }}
              />
              <span>{TYPE_LABELS[t]}</span>
              <span style={{ color: '#9ca3af' }}>·</span>
              <span style={{ color: '#9ca3af' }}>{kgData.stats[t]} 节点</span>
            </div>
          ))}
        </div>

        {/* 提示 */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'rgba(255,255,255,0.85)',
            padding: '6px 10px',
            border: '1px solid #e5e7eb',
            borderRadius: 6,
            fontSize: 11,
            color: '#6b7280',
            pointerEvents: 'none',
          }}
        >
          点击节点查看详情 · 拖动节点调整位置 · 滚动放大显示文字
        </div>
      </div>

      {/* ===== 节点详情弹窗（居中） ===== */}
      {selectedNode && (
        <Modal
          node={selectedNode}
          onClose={() => setSelectedId(null)}
          onNodeClick={(id) => setSelectedId(id)}
        />
      )}
    </div>
  )
}

// ===== 居中弹窗 =====

function Modal({
  node,
  onClose,
  onNodeClick,
}: {
  node: KGNode
  onClose: () => void
  onNodeClick: (id: string) => void
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 40,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 72,
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 32px 100px rgba(0,0,0,0.3)',
            width: 'min(1360px, 96vw)',
            height: 'min(900px, calc(100vh - 88px))',
            maxWidth: 'none',
            maxHeight: 'none',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'scaleIn 0.2s ease-out',
          }}
        >
          {/* 顶部栏 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 24px',
              borderBottom: `2px solid ${TYPE_COLORS[node.type]}`,
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  fontSize: 12,
                  background: TYPE_COLORS[node.type],
                  color: '#fff',
                  borderRadius: 10,
                }}
              >
                {TYPE_ICONS[node.type]} {TYPE_LABELS[node.type]}
              </span>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>
                {node.name}
              </span>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: 24,
                color: '#9ca3af',
                cursor: 'pointer',
                padding: '4px 8px',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* ===== 主体：左 iframe + 右 关联笔记 ===== */}
          <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            {/* 左：HTML 卡片 iframe */}
            <iframe
              key={node.id}
              src={`/antenna-tracker/kg-cards-rendered/${encodeURIComponent(node.id)}.html`}
              title={`${node.name} 科普卡片`}
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation allow-top-navigation-by-user-activation"
            />

            {/* 右：关联笔记侧栏（实时取自 KG 图谱数据，非 iframe 内的 top-3） */}
            <RelatedNotesPanel
              nodeId={node.id}
              onNodeClick={onNodeClick}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  )
}

// ===== 关联笔记侧栏 =====

function RelatedNotesPanel({
  nodeId,
  onNodeClick,
}: {
  nodeId: string
  onNodeClick: (id: string) => void
}) {
  // 直接由 KG 全量关系自算，不依赖父组件 memo。
  // 注意：d3 forceLink 会把 links 的 source/target 从字符串原地改成节点对象，
  // 所以比对时要兼容两种形态（typeof === 'string' ? id : .id）。
  const { outgoing, incoming } = useMemo(() => {
    const out = new Set<string>()
    const inc = new Set<string>()
    const idOf = (x: any) => (typeof x === 'string' ? x : x?.id)
    for (const l of kgData.links) {
      if (idOf(l.source) === nodeId) out.add(idOf(l.target) as string)
      if (idOf(l.target) === nodeId) inc.add(idOf(l.source) as string)
    }
    const m = new Map<string, KGNode>()
    for (const n of kgData.nodes) m.set(n.id, n)
    const resolve = (s: Set<string>) =>
      Array.from(s).map((id) => m.get(id)).filter(Boolean) as KGNode[]
    return { outgoing: resolve(out), incoming: resolve(inc) }
  }, [nodeId])

  const [showAllOut, setShowAllOut] = useState(false)
  const [showAllIn, setShowAllIn] = useState(false)

  const total = outgoing.length + incoming.length

  if (total === 0) {
    return (
      <aside
        style={{
          width: 320,
          flexShrink: 0,
          borderLeft: '1px solid #e5e7eb',
          background: '#f9fafb',
          padding: 20,
          fontSize: 13,
          color: '#9ca3af',
          textAlign: 'center',
          overflowY: 'auto',
        }}
      >
        📚 关联笔记
        <div style={{ marginTop: 12, fontSize: 12 }}>暂无关联</div>
      </aside>
    )
  }

  const renderList = (list: KGNode[], expanded: boolean, toggle: () => void) => {
    const visible = expanded ? list : list.slice(0, 9)
    const hidden = list.length - visible.length
    return (
      <>
        {visible.map((n) => (
          <button
            key={n.id}
            onClick={() => onNodeClick(n.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '8px 10px',
              marginBottom: 4,
              background: '#fff',
              border: `1px solid ${TYPE_COLORS[n.type]}33`,
              borderLeft: `3px solid ${TYPE_COLORS[n.type]}`,
              borderRadius: 6,
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${TYPE_COLORS[n.type]}11`
              e.currentTarget.style.transform = 'translateX(2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff'
              e.currentTarget.style.transform = 'translateX(0)'
            }}
            title={n.nameEn || n.name}
          >
            <span
              style={{
                color: TYPE_COLORS[n.type],
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {TYPE_ICONS[n.type]}
            </span>
            <span
              style={{
                fontSize: 12.5,
                color: '#374151',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {n.name}
            </span>
          </button>
        ))}
        {hidden > 0 && (
          <button
            onClick={toggle}
            style={{
              width: '100%',
              padding: '6px',
              marginTop: 4,
              background: 'transparent',
              border: '1px dashed #d1d5db',
              borderRadius: 6,
              color: '#6b7280',
              fontSize: 11.5,
              cursor: 'pointer',
            }}
          >
            ▼ 展开剩余 {hidden} 条
          </button>
        )}
        {expanded && list.length > 9 && (
          <button
            onClick={toggle}
            style={{
              width: '100%',
              padding: '6px',
              marginTop: 4,
              background: 'transparent',
              border: '1px dashed #d1d5db',
              borderRadius: 6,
              color: '#6b7280',
              fontSize: 11.5,
              cursor: 'pointer',
            }}
          >
            ▲ 收起
          </button>
        )}
      </>
    )
  }

  return (
    <aside
      style={{
        width: 320,
        flexShrink: 0,
        borderLeft: '1px solid #e5e7eb',
        background: '#f9fafb',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          background: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
          📚 关联笔记 <span style={{ color: '#6b7280', fontWeight: 400 }}>({total})</span>
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>
          实时取自 KG 图谱，非卡片内置 top-3
        </div>
      </div>

      {outgoing.length > 0 && (
        <section style={{ padding: '12px 12px 4px' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 8,
              padding: '0 4px',
            }}
          >
            ➤ 出向关联（此节点依赖 / 引用） · {outgoing.length}
          </div>
          {renderList(outgoing, showAllOut, () => setShowAllOut(!showAllOut))}
        </section>
      )}

      {incoming.length > 0 && (
        <section style={{ padding: '8px 12px 16px' }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 8,
              padding: '0 4px',
            }}
          >
            ← 入向关联（被此节点引用） · {incoming.length}
          </div>
          {renderList(incoming, showAllIn, () => setShowAllIn(!showAllIn))}
        </section>
      )}
    </aside>
  )
}
