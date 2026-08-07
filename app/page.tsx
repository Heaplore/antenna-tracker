'use client'

import { useEffect, useRef, useState } from 'react'
import PageHeader from '@/components/PageHeader'

export default function HomePage() {
  const chartRefs = useRef<{ market?: HTMLDivElement | null; share?: HTMLDivElement | null; cagr?: HTMLDivElement | null; roadmap?: HTMLDivElement | null }>({})
  const kpiRef = useRef<HTMLDivElement>(null)
  const conclusionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load ECharts
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js'
    script.async = true
    document.head.appendChild(script)

    script.onload = () => {
      initCharts()
      initScrollSpy()
      initSidebarProgress()
      initScrollReveal()
      initKpiCountUp()
    }

    return () => {
      const s = document.querySelector("script[src*='echarts']")
      if (s) s.remove()
    }
  }, [])

  function initCharts() {
    if (typeof window === 'undefined' || !(window as any).echarts) return
    const echarts = (window as any).echarts
    const accent = '#2563eb'
    const accent2 = '#06b6d4'
    const ink = '#0a0f1e'
    const muted = '#5b6a8a'
    const rule = '#dce1eb'
    const bg2 = '#ffffff'

    // Chart 1
    if (chartRefs.current.market) {
      const c1 = echarts.init(chartRefs.current.market!, null, { renderer: 'svg' })
      c1.setOption({
        tooltip: { trigger: 'axis', appendToBody: true, backgroundColor: '#fff', borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
        legend: { data: ['中国通信天线(亿元RMB)', '全球Massive MIMO AAU(亿美元)', '全球5G相控阵天线(亿美元)'], textStyle: { color: muted, fontSize: 10.5 }, top: 5 },
        grid: { left: 50, right: 30, top: 50, bottom: 35 },
        xAxis: { type: 'category', data: ['2023','2024','2025E','2026E','2027E','2028E','2029E','2030E','2031E'], axisLabel: { color: muted, fontSize: 10 }, axisLine: { lineStyle: { color: rule } } },
        yAxis: [
          { type: 'value', name: '亿元 RMB', nameTextStyle: { color: muted, fontSize: 10 }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
          { type: 'value', name: '亿美元', nameTextStyle: { color: muted, fontSize: 10 }, axisLabel: { color: muted, fontSize: 10 }, splitLine: { show: false } }
        ],
        series: [
          { name: '中国通信天线(亿元RMB)', type: 'line', smooth: true, data: [256.8,274.5,290.2,305.7,320.53,342.8,368.2,395.6,425.8], lineStyle: { color: accent, width: 2.5 }, itemStyle: { color: accent }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: accent+'33' }, { offset: 1, color: accent+'05' }] } }, symbol: 'circle', symbolSize: 6 },
          { name: '全球Massive MIMO AAU(亿美元)', type: 'line', smooth: true, yAxisIndex: 1, data: [null,16.25,21,27,34,41,47,51,53.12], lineStyle: { color: accent2, width: 2.5 }, itemStyle: { color: accent2 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: accent2+'33' }, { offset: 1, color: accent2+'05' }] } }, symbol: 'circle', symbolSize: 6 },
          { name: '全球5G相控阵天线(亿美元)', type: 'line', smooth: true, yAxisIndex: 1, data: [null,null,null,null,null,null,null,5.95,null], lineStyle: { color: muted, width: 2, type: 'dashed' }, itemStyle: { color: muted }, symbol: 'diamond', symbolSize: 8 }
        ]
      })
      window.addEventListener('resize', () => c1.resize())
    }

    // Chart 2
    if (chartRefs.current.share) {
      const c2 = echarts.init(chartRefs.current.share!, null, { renderer: 'svg' })
      c2.setOption({
        tooltip: { trigger: 'item', appendToBody: true, backgroundColor: '#fff', borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
        legend: { orient: 'vertical', right: 15, top: 'center', textStyle: { color: ink, fontSize: 10.5 }, data: ['华为','中兴通讯','通宇通讯','京信通信','摩比发展','Commscope','爱立信','其他'] },
        series: [{
          type: 'pie', radius: ['38%','65%'], center: ['32%','50%'], avoidLabelOverlap: false,
          itemStyle: { borderRadius: 4, borderColor: bg2, borderWidth: 2 },
          label: { show: true, position: 'outside', formatter: '{b}\n{d}%', color: ink, fontSize: 10.5 },
          emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' }, itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.1)' } },
          data: [
            { value: 29.4, name: '华为', itemStyle: { color: accent } },
            { value: 18.6, name: '中兴通讯', itemStyle: { color: accent2 } },
            { value: 14.2, name: '通宇通讯', itemStyle: { color: '#d97706' } },
            { value: 12.0, name: '京信通信', itemStyle: { color: '#059669' } },
            { value: 8.0, name: '摩比发展', itemStyle: { color: '#7c3aed' } },
            { value: 7.8, name: 'Commscope', itemStyle: { color: '#db2777' } },
            { value: 5.0, name: '爱立信', itemStyle: { color: '#2563eb' } },
            { value: 5.0, name: '其他', itemStyle: { color: muted } }
          ]
        }]
      })
      window.addEventListener('resize', () => c2.resize())
    }

    // Chart 3
    if (chartRefs.current.cagr) {
      const c3 = echarts.init(chartRefs.current.cagr!, null, { renderer: 'svg' })
      c3.setOption({
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, appendToBody: true, backgroundColor: '#fff', borderColor: rule, textStyle: { color: ink, fontSize: 12 } },
        grid: { left: 110, right: 40, top: 10, bottom: 20 },
        xAxis: { type: 'value', axisLabel: { color: muted, fontSize: 10, formatter: '{value}%' }, splitLine: { lineStyle: { color: rule, type: 'dashed' } } },
        yAxis: { type: 'category', data: ['全球5G天线','中国通信天线','全球5G-A AAU','全球5G相控阵天线','全球5G设备整体'], axisLabel: { color: ink, fontSize: 10.5 } },
        series: [{
          type: 'bar', barWidth: 18,
          data: [
            { value: -1.3, itemStyle: { color: muted, borderRadius: [0,3,3,0] } },
            { value: 2.3, itemStyle: { color: muted, borderRadius: [0,3,3,0] } },
            { value: 21.0, itemStyle: { color: accent, borderRadius: [0,3,3,0] } },
            { value: 44.2, itemStyle: { color: accent2, borderRadius: [0,3,3,0] } },
            { value: 81.05, itemStyle: { color: '#d97706', borderRadius: [0,3,3,0] } }
          ],
          label: { show: true, position: 'right', formatter: '{c}%', color: ink, fontSize: 11, fontWeight: 'bold' }
        }]
      })
      window.addEventListener('resize', () => c3.resize())
    }

    // Chart 4
    if (chartRefs.current.roadmap) {
      const c4 = echarts.init(chartRefs.current.roadmap!, null, { renderer: 'svg' })
      const tNames = ['传统基站天线','Massive MIMO AAU','毫米波天线','5G-A 通感一体化','RIS 智能超表面','太赫兹天线','空天地一体化','AI 原生天线']
      const tStart = [2019,2019,2020,2024,2024,2025,2024,2025]
      const tEnd = [2024,2027,2026,2028,2030,2031,2030,2031]
      const tDesc = ['2G/3G/4G 延续至今','当前主流，向192T192R演进','热点覆盖为主，LEO卫星驱动爆发','5G-A商用元年，通信+感知融合','2026-27小规模商用，2030+6G标配','6G核心频段，当前预研阶段','卫星直连手机+星地融合','AI辅助波束管理/信道估计']
      const tColors = [muted, accent, accent+'cc', accent2, accent2+'cc', '#d97706', '#d97706cc', '#7c3aed']

      c4.setOption({
        tooltip: {
          trigger: 'axis', axisPointer: { type: 'shadow' }, appendToBody: true,
          backgroundColor: '#fff', borderColor: rule, textStyle: { color: ink, fontSize: 12 },
          formatter: function(p: any) {
            const i = p[0].dataIndex
            return tNames[i]+'<br/>'+tDesc[i]+'<br/>'+tStart[i]+' \u2192 '+tEnd[i]
          }
        },
        grid: { left: 145, right: 190, top: 15, bottom: 35 },
        xAxis: {
          type: 'value', min: 2018.5, max: 2031.5,
          axisLabel: { color: muted, fontSize: 10, formatter: '{value}' },
          splitLine: { lineStyle: { color: rule, type: 'dashed' } },
          axisLine: { lineStyle: { color: rule } }
        },
        yAxis: {
          type: 'category', data: tNames,
          axisLabel: { color: ink, fontSize: 10.5 },
          axisLine: { lineStyle: { color: rule } }
        },
        series: [{
          type: 'custom',
          renderItem: function(params: any, api: any) {
            const yIndex = params.dataIndex
            const startY = tStart[yIndex]
            const endY = tEnd[yIndex]
            const startCoord = api.coord([startY, yIndex])
            const endCoord = api.coord([endY, yIndex])
            const rectStyle = api.style({ fill: tColors[yIndex], borderRadius: 3 })
            return {
              type: 'rect',
              shape: {
                x: startCoord[0],
                y: startCoord[1] - 7,
                width: Math.max(endCoord[0] - startCoord[0], 1),
                height: 14,
                r: 3
              },
              style: rectStyle
            }
          },
          data: tNames.map(function(_: any, i: number) { return i }),
          label: {
            show: true, position: 'right',
            formatter: function(p: any) {
              const i = p.dataIndex
              return tStart[i]+' \u2192 '+tEnd[i]+': '+tDesc[i]
            },
            fontSize: 8.5, color: ink, overflow: 'truncate'
          }
        }]
      })
      window.addEventListener('resize', () => c4.resize())
    }
  }

  function initScrollSpy() {
    const links = document.querySelectorAll('.sidebar-nav a')
    const sections: { el: HTMLElement; link: Element }[] = []
    links.forEach(a => {
      const href = a.getAttribute('href')
      if (href && href.startsWith('#')) {
        const el = document.getElementById(href.slice(1))
        if (el) sections.push({ el, link: a })
      }
    })

    function update() {
      const scrollY = window.scrollY + 100
      let idx = -1
      for (let i = 0; i < sections.length; i++) {
        if (scrollY >= sections[i].el.offsetTop - 10) idx = i
        else break
      }
      links.forEach(l => l.classList.remove('active'))
      if (idx >= 0) sections[idx].link.classList.add('active')
    }

    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    setTimeout(update, 100)

    links.forEach(a => {
      a.addEventListener('click', e => {
        const href = a.getAttribute('href')
        if (href && href.startsWith('#')) {
          e.preventDefault()
          const target = document.getElementById(href.slice(1))
          if (target) {
            window.scrollTo({ top: target.offsetTop - 20, behavior: 'smooth' })
            const sb = document.querySelector('.sidebar')
            if (sb) sb.classList.remove('mobile-open')
            const ov = document.getElementById('sidebarOverlay')
            if (ov) ov.classList.remove('show')
          }
        }
      })
    })
  }

  function initSidebarProgress() {
    const bar = document.getElementById('sidebarProgress')
    if (!bar) return
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0
      bar.style.width = Math.min(progress, 100) + '%'
    }, { passive: true })
  }

  function initScrollReveal() {
    const els = document.querySelectorAll('section, .kpi-card, .chart-box, .card, .callout, .table-wrap, .conclusion-box')
    if (!('IntersectionObserver' in window)) {
      els.forEach((el: Element) => { (el as HTMLElement).style.opacity = '1' })
      return
    }
    els.forEach((el, i) => {
      (el as HTMLElement).style.opacity = '0'
      ;(el as HTMLElement).style.transform = 'translateY(24px)'
      ;(el as HTMLElement).style.transition = 'opacity 0.7s ease-out, transform 0.7s ease-out'
      ;(el as HTMLElement).style.transitionDelay = ((i % 6) * 0.07) + 's'
    })
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).style.opacity = '1'
          ;(entry.target as HTMLElement).style.transform = 'translateY(0)'
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' })
    els.forEach(el => observer.observe(el))
  }

  function initKpiCountUp() {
    const nums = document.querySelectorAll('.kpi-number[data-target]')
    if (!nums.length || !('IntersectionObserver' in window)) return

    function animate(el: Element) {
      const target = parseFloat(el.getAttribute('data-target')!)
      const suffix = el.getAttribute('data-suffix') || ''
      const decimal = parseInt(el.getAttribute('data-decimal') || '0')
      let startTime: number | null = null
      function step(ts: number) {
        if (!startTime) startTime = ts
        const progress = Math.min((ts - startTime) / 1500, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        const current = target * eased
        el.textContent = (decimal > 0 ? current.toFixed(decimal) : Math.round(current)) + suffix
        if (progress < 1) requestAnimationFrame(step)
        else el.textContent = (decimal > 0 ? target.toFixed(decimal) : target) + suffix
      }
      requestAnimationFrame(step)
    }

    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { animate(entry.target); obs.unobserve(entry.target) }
      })
    }, { threshold: 0.5 })
    nums.forEach(el => obs.observe(el))
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Mobile sidebar toggle */}
      <button className="sidebar-mobile-btn" id="sidebarToggle" aria-label="打开目录">&#9776;</button>
      <div className="sidebar-overlay" id="sidebarOverlay"></div>

      {/* 统一版头（与其他页一致，整行居中，目录在其下方） */}
      <div className="home-header">
        <PageHeader
          title="全球天线行业市场格局及技术发展现状趋势"
          subtitle="从5G建设高峰期到5G-A/6G过渡期的系统性分析：市场规模、竞争格局、技术演进与未来展望"
          updateInfo="2026年8月 · L3 深度建模"
        />
      </div>

      <div className="layout">
        <nav className="sidebar">
          <div className="sidebar-progress"><div className="sidebar-progress-bar" id="sidebarProgress"></div></div>
          <div className="sidebar-title">目录导航</div>
          <ul className="sidebar-nav">
            <li><a href="#sec-1"><span className="nav-chap">01</span><span className="nav-text">行业概述</span></a></li>
            <li><a href="#sec-2"><span className="nav-chap">02</span><span className="nav-text">市场规模与增长</span></a></li>
            <li className="sub"><a href="#sec-2-1"><span className="nav-text">2.1 总体规模</span></a></li>
            <li className="sub"><a href="#sec-2-2"><span className="nav-text">2.2 区域市场</span></a></li>
            <li className="sub"><a href="#sec-2-3"><span className="nav-text">2.3 驱动因素</span></a></li>
            <li><a href="#sec-3"><span className="nav-chap">03</span><span className="nav-text">竞争格局</span></a></li>
            <li className="sub"><a href="#sec-3-1"><span className="nav-text">3.1 全球梯队</span></a></li>
            <li className="sub"><a href="#sec-3-2"><span className="nav-text">3.2 中国市场</span></a></li>
            <li><a href="#sec-4"><span className="nav-chap">04</span><span className="nav-text">技术发展现状</span></a></li>
            <li className="sub"><a href="#sec-4-1"><span className="nav-text">4.1 5G天线</span></a></li>
            <li className="sub"><a href="#sec-4-2"><span className="nav-text">4.2 5G-A</span></a></li>
            <li className="sub"><a href="#sec-4-3"><span className="nav-text">4.3 6G前沿</span></a></li>
            <li><a href="#sec-5"><span className="nav-chap">05</span><span className="nav-text">产业链分析</span></a></li>
            <li><a href="#sec-6"><span className="nav-chap">06</span><span className="nav-text">技术发展路线图</span></a></li>
            <li><a href="#sec-7"><span className="nav-chap">07</span><span className="nav-text">挑战与风险</span></a></li>
            <li><a href="#sec-8"><span className="nav-chap">08</span><span className="nav-text">未来展望</span></a></li>
            <li><a href="#sec-9"><span className="nav-chap">09</span><span className="nav-text">结论</span></a></li>
          </ul>
        </nav>

        <div className="main-area">

          <div className="content">

            {/* KPI Strip */}
            <div className="kpi-strip" ref={kpiRef}>
              <div className="kpi-card">
                <span className="kpi-icon">&#9670;</span>
                <div className="kpi-number blue" data-target="320.53" data-suffix="亿" data-decimal="2">0</div>
                <div className="kpi-label">全球天线市场<br/>2024年市场规模(元)</div>
              </div>
              <div className="kpi-card">
                <span className="kpi-icon">&#9650;</span>
                <div className="kpi-number green" data-target="21.0" data-suffix="%" data-decimal="1">0</div>
                <div className="kpi-label">全球Massive MIMO<br/>AAU市场CAGR</div>
              </div>
              <div className="kpi-card">
                <span className="kpi-icon">&#9733;</span>
                <div className="kpi-number orange" data-target="44.2" data-suffix="%" data-decimal="1">0</div>
                <div className="kpi-label">全球5G相控阵<br/>天线市场CAGR</div>
              </div>
              <div className="kpi-card">
                <span className="kpi-icon">&#9679;</span>
                <div className="kpi-number purple" data-target="29.4" data-suffix="%" data-decimal="1">0</div>
                <div className="kpi-label">华为国内基站<br/>天线市场份额</div>
              </div>
            </div>

            {/* Section 1: 行业概述 */}
            <section id="sec-1">
              <div className="section-num">CHAPTER 01</div>
              <h2>行业概述</h2>
              <p>天线是无线通信系统的核心部件，负责将电信号转换为电磁波（发射）或将电磁波转换为电信号（接收）。随着移动通信从2G向5G-A和6G演进，天线技术经历了<span className="key">传统定向/全向天线到大规模MIMO有源天线（AAU）</span>的深刻变革。</p>

              <h3>1.1 天线产品分类</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>分类维度</th><th>类型</th><th>说明</th></tr></thead>
                  <tbody>
                    <tr><td>应用场景</td><td>基站天线</td><td>地面蜂窝网络基站使用</td></tr>
                    <tr><td></td><td>移动终端天线</td><td>手机、车载终端、IoT设备</td></tr>
                    <tr><td></td><td>卫星天线</td><td>低轨/高轨卫星通信</td></tr>
                    <tr><td></td><td>室内小基站天线</td><td>室内覆盖增强</td></tr>
                    <tr><td>频段</td><td>Sub-6GHz天线</td><td>支持FR1频段（&lt;6GHz）</td></tr>
                    <tr><td></td><td>毫米波天线</td><td>支持FR2频段（24-100GHz）</td></tr>
                    <tr><td></td><td>太赫兹天线</td><td>6G预研方向（&gt;100GHz）</td></tr>
                    <tr><td>技术形态</td><td>无源天线</td><td>传统反射/透射结构</td></tr>
                    <tr><td></td><td>有源天线（AAU）</td><td>集成射频前端，支持Massive MIMO</td></tr>
                    <tr><td></td><td>智能超表面（RIS）</td><td>可编程电磁调控，6G关键技术</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 2: 市场规模 */}
            <section id="sec-2">
              <div className="section-num">CHAPTER 02</div>
              <h2>市场规模与增长预测</h2>

              <div id="sec-2-1"></div>
              <h3>2.1 全球天线市场总体规模</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>细分市场</th><th>基期规模</th><th>预测期规模</th><th>CAGR</th></tr></thead>
                  <tbody>
                    <tr><td>全球天线市场</td><td>320.53亿元 (2024)</td><td>484.26亿元 (2030)</td><td>7.12% (CAGR)<sup><a href="#cite-1">[1]</a></sup></td></tr>
                    <tr><td>全球5G天线</td><td>144亿元RMB (2023)</td><td>142.9亿元RMB (2030)</td><td>-1.3%<sup><a href="#cite-2">[2]</a></sup></td></tr>
                    <tr><td>全球Massive MIMO AAU</td><td>16.25亿美元 (2024)</td><td>53.12亿美元 (2031)</td><td>21.0%<sup><a href="#cite-3">[3]</a></sup></td></tr>
                    <tr><td>全球5G相控阵天线</td><td>基数较小</td><td>5.95亿美元 (2030)</td><td>44.2%<sup><a href="#cite-4">[4]</a></sup></td></tr>
                    <tr><td>全球5G设备整体</td><td>&mdash;</td><td>+1469.5亿美元 (2028)</td><td>81.05%<sup><a href="#cite-5">[5]</a></sup></td></tr>
                  </tbody>
                </table>
              </div>

              <div className="callout warn">
                <span className="callout-icon">&#9888;</span>
                <strong>&#9888; 关键洞察</strong>
                <p>全球5G天线市场整体趋于饱和（CAGR -1.3%），但<strong>Massive MIMO AAU升级</strong>和<strong>相控阵天线</strong>呈现高速增长，市场结构性分化明显。</p>
              </div>

              <div id="sec-2-2"></div>
              <h3>2.2 区域市场分析</h3>
              <div className="grid-4">
                <div className="card">
                  <h4>&#127983;&#127475;&#127482; 中国</h4>
                  <ul>
                    <li>全球最大5G市场</li>
                    <li>5G连接数超10亿</li>
                    <li>国产化率超80%</li>
                    <li>5G-A商用元年</li>
                  </ul>
                </div>
                <div className="card">
                  <h4>&#127758; 北美</h4>
                  <ul>
                    <li>毫米波为主</li>
                    <li>运营商Capex增长</li>
                    <li>Starlink带动卫星天线</li>
                  </ul>
                </div>
                <div className="card">
                  <h4>&#127466;&#127482; 欧洲</h4>
                  <ul>
                    <li>爱立信/诺基亚</li>
                    <li>5G部署较慢</li>
                    <li>Hexa-X推进6G</li>
                  </ul>
                </div>
                <div className="card">
                  <h4>&#127759; 亚太</h4>
                  <ul>
                    <li>印度BTS超45万</li>
                    <li>东南亚/中东加速</li>
                    <li>渗透率提升空间大</li>
                  </ul>
                </div>
              </div>

              <div id="sec-2-3"></div>
              <h3>2.3 增长驱动因素</h3>
              <ol>
                <li><span className="key">5G-A商用化</span> &mdash; 2024年"5G-A商用元年"，3GPP R18标准冻结<sup><a href="#cite-6">[6]</a></sup></li>
                <li><span className="key">卫星互联网爆发</span> &mdash; Starlink、Kuiper等LEO星座建设</li>
                <li><span className="key">6G预研投入</span> &mdash; 中国2025年《政府工作报告》将6G纳入未来产业<sup><a href="#cite-7">[7]</a></sup></li>
                <li><span className="key">AI融合</span> &mdash; AI for network / network for AI成为6G主线</li>
                <li><span className="key">物联网扩展</span> &mdash; 海量IoT设备催生新型终端天线需求</li>
              </ol>

              <div className="chart-box">
                <figcaption>图1：主要天线细分市场增长趋势对比（2023-2031）</figcaption>
                <div ref={el => { chartRefs.current.market = el }} style={{ width: '100%', minHeight: '360px' }}></div>
              </div>
            </section>

            {/* Section 3: 竞争格局 */}
            <section id="sec-3">
              <div className="section-num">CHAPTER 03</div>
              <h2>竞争格局分析</h2>

              <div id="sec-3-1"></div>
              <h3>3.1 全球竞争梯队</h3>
              <div className="grid-2">
                <div className="card" style={{ borderColor: 'var(--accent)', borderTopColor: 'var(--accent)' }}>
                  <h4 style={{ color: 'var(--accent)' }}>第一梯队 &middot; 全球领导者</h4>
                  <ul>
                    <li><strong>华为</strong> &mdash; 基站天线份额约29.4%，5G核心技术领先<sup><a href="#cite-8">[8]</a></sup></li>
                    <li><strong>爱立信</strong> &mdash; 瑞典，全球5G网络设备主要供应商</li>
                    <li><strong>康普/CommScope</strong> &mdash; 美国，全球领先无源天线供应商</li>
                    <li><strong>诺基亚</strong> &mdash; 芬兰，5G网络设备供应商</li>
                  </ul>
                </div>
                <div className="card" style={{ borderColor: 'var(--accent2)', borderTopColor: 'var(--accent2)' }}>
                  <h4 style={{ color: 'var(--accent2)' }}>第二梯队 &middot; 专业天线厂商</h4>
                  <ul>
                    <li><strong>中兴通讯</strong> &mdash; 国内市场份额约18.6%</li>
                    <li><strong>通宇通讯</strong> &mdash; 国内14.2%，全球前五</li>
                    <li><strong>京信通信</strong> &mdash; 基站天线市场重要参与者</li>
                    <li><strong>摩比发展</strong> &mdash; 天线及射频组件供应商</li>
                  </ul>
                </div>
              </div>

              <div id="sec-3-2"></div>
              <h3>3.2 中国市场格局</h3>
              <div className="callout success">
                <span className="callout-icon">&#10003;</span>
                <strong>&#10003; 高度集中</strong>
                <p>2024年，华为、京信通信、通宇通讯等企业在基站天线市场的合计份额超过80%<sup><a href="#cite-8">[8]</a></sup>。</p>
              </div>

              <div className="chart-box">
                <figcaption>图2：中国基站天线市场主要企业份额分布（2024年）</figcaption>
                <div ref={el => { chartRefs.current.share = el }} style={{ width: '100%', minHeight: '360px' }}></div>
              </div>

              <h3>3.3 竞争态势总结</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>趋势</th><th>影响</th></tr></thead>
                  <tbody>
                    <tr><td>5G建设高峰期已过</td><td>全球5G基站部署进入后期，天线市场从增量转向存量替换+升级</td></tr>
                    <tr><td>5G-A带来新机遇</td><td>Massive MIMO AAU升级、通感一体化天线、RIS等新技术催生新一轮需求</td></tr>
                    <tr><td>卫星天线成新增长极</td><td>LEO星座建设带动相控阵天线需求快速增长（CAGR 44.2%）</td></tr>
                    <tr><td>中国企业崛起</td><td>华为、中兴、通宇通讯等在全球市场份额持续提升</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 4: 技术发展现状 */}
            <section id="sec-4">
              <div className="section-num">CHAPTER 04</div>
              <h2>技术发展现状</h2>

              <div id="sec-4-1"></div>
              <h3>4.1 5G天线技术现状</h3>

              <h4>Massive MIMO AAU（主流技术）</h4>
              <p><span className="key">有源天线单元</span>，集成射频前端与数字波束赋形，支持64T64R、192T192R等大规模天线阵列。2024年市场规模约16.25亿美元<sup><a href="#cite-3">[3]</a></sup>。</p>

              <div className="timeline">
                <div className="timeline-item" data-num="1">
                  <div className="tl-year">演进路径</div>
                  <p>4T4R &rarr; 64T64R &rarr; 192T192R（通道数持续增加）</p>
                </div>
                <div className="timeline-item" data-num="2">
                  <div className="tl-year">频段覆盖</div>
                  <p>Sub-6GHz（n77/n78/n79）+ 毫米波（n257/n258/n261）</p>
                </div>
                <div className="timeline-item" data-num="3">
                  <div className="tl-year">AI赋能</div>
                  <p>集成AI算法实现智能波束管理</p>
                </div>
              </div>

              <h4>毫米波天线</h4>
              <ul style={{ paddingLeft: '1.5rem', color: 'var(--muted)' }}>
                <li>频段：24-100GHz（FR2）</li>
                <li>特点：大带宽、短距离、穿透损耗大</li>
                <li>部署策略：以热点覆盖为主（场馆、商圈、室内）</li>
              </ul>

              <h4>相控阵天线（Phased Array）</h4>
              <p><span className="key">通过控制阵列天线各单元的相位差实现波束扫描</span>。2024-2030年CAGR达44.2%<sup><a href="#cite-4">[4]</a></sup>。</p>

              <div id="sec-4-2"></div>
              <h3>4.2 5G-A（5.5G）天线技术</h3>
              <p>2024年被定义为"5G-A商用元年"，天线技术关键进展：</p>
              <div className="grid-4">
                <div className="card">
                  <h4>三载波聚合</h4>
                  <p>提升频谱效率</p>
                </div>
                <div className="card">
                  <h4>通感一体化（ISAC）</h4>
                  <p>天线同时支持通信和感知功能</p>
                </div>
                <div className="card">
                  <h4>RedCap天线</h4>
                  <p>面向中等速率IoT场景优化</p>
                </div>
                <div className="card">
                  <h4>XR/裸眼3D专网</h4>
                  <p>面向沉浸式应用优化</p>
                </div>
              </div>

              <div id="sec-4-3"></div>
              <h3>4.3 6G天线前沿技术</h3>

              <h4>智能超表面（RIS/IRS）</h4>
              <div className="callout info">
                <span className="callout-icon">&#128161;</span>
                <strong>&#128161; 核心原理</strong>
                <p>由大量可编程电磁单元构成的平面结构，通过调控单元参数实现电磁波的反射/透射幅度和相位分布控制。<span className="key">被认为是6G关键技术之一</span><sup><a href="#cite-11">[11]</a></sup>。</p>
              </div>
              <ul style={{ paddingLeft: '1.5rem', color: 'var(--ink)' }}>
                <li><strong>优势：</strong>低成本、低能耗、易部署</li>
                <li><strong>突破：</strong>清华大学张平武团队提出STAR-RIS（同时透射和反射），实现360&deg;覆盖</li>
                <li><strong>产业化：</strong>中兴Dynamic RIS 2.0已发布；中国移动+中兴在杭州亚运会完成全球首个大型赛事RIS部署</li>
                <li><strong>标准化：</strong>3GPP Rel-18/19开始讨论RIS相关增强功能</li>
              </ul>

              <h4>太赫兹天线</h4>
              <ul style={{ paddingLeft: '1.5rem', color: 'var(--muted)' }}>
                <li>频段：&gt;100GHz（0.1-10THz）</li>
                <li>意义：6G核心频段，提供超大带宽</li>
                <li>进展：华为220GHz太赫兹通感一体化原型机实现240Gbps传输速率<sup><a href="#cite-12">[12]</a></sup></li>
              </ul>

              <h4>空天地一体化天线</h4>
              <ul style={{ paddingLeft: '1.5rem', color: 'var(--muted)' }}>
                <li>卫星直连手机（Direct to Cell）</li>
                <li>低轨卫星（LEO）终端天线（相控阵）</li>
                <li>星地融合Massive MIMO</li>
              </ul>

              <div className="chart-box">
                <figcaption>图3：主要天线细分市场年复合增长率对比</figcaption>
                <div ref={el => { chartRefs.current.cagr = el }} style={{ width: '100%', minHeight: '280px' }}></div>
              </div>
            </section>

            {/* Section 5: 产业链分析 */}
            <section id="sec-5">
              <div className="section-num">CHAPTER 05</div>
              <h2>产业链分析</h2>

              <h3>5.1 上游：原材料与元器件</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>环节</th><th>关键材料/器件</th><th>主要供应商</th></tr></thead>
                  <tbody>
                    <tr><td>基板材料</td><td>PCB/FPC、陶瓷基板</td><td>深南电路、沪电股份、鹏鼎控股</td></tr>
                    <tr><td>射频芯片</td><td>PA、LNA、Switch、Filter</td><td>高通、博通、Skyworks、卓胜微</td></tr>
                    <tr><td>连接器</td><td>射频连接器</td><td>罗森伯格、安费诺、意华股份</td></tr>
                    <tr><td>天线振子</td><td>金属贴片、介质材料</td><td>通宇通讯、京信通信自产</td></tr>
                  </tbody>
                </table>
              </div>

              <h3>5.2 下游：应用市场</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>应用领域</th><th>代表客户</th><th>天线需求特点</th></tr></thead>
                  <tbody>
                    <tr><td>运营商网络</td><td>中国移动、Verizon、Vodafone</td><td>大规模Massive MIMO AAU</td></tr>
                    <tr><td>卫星互联网</td><td>SpaceX/Starlink、Amazon/Kuiper</td><td>相控阵天线</td></tr>
                    <tr><td>终端设备</td><td>苹果、三星、华为、小米</td><td>小型化多频终端天线</td></tr>
                    <tr><td>车联网/物联网</td><td>车企、IoT设备商</td><td>低频段、低功耗天线</td></tr>
                    <tr><td>国防军工</td><td>各国军方</td><td>高可靠、抗干扰天线</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 6: 技术发展路线图 */}
            <section id="sec-6">
              <div className="section-num">CHAPTER 06</div>
              <h2>技术发展路线图</h2>

              <div className="chart-box">
                <figcaption>图4：天线技术发展路线图（2019-2031）</figcaption>
                <div ref={el => { chartRefs.current.roadmap = el }} style={{ width: '100%', minHeight: '440px' }}></div>
              </div>

              <h3>关键时间节点</h3>
              <div className="timeline">
                <div className="timeline-item" data-num="1">
                  <div className="tl-year">2019年</div>
                  <p>全球5G商用元年，Massive MIMO AAU开始部署</p>
                </div>
                <div className="timeline-item" data-num="2">
                  <div className="tl-year">2024年</div>
                  <p>5G-A商用元年，3GPP R18标准冻结<sup><a href="#cite-6">[6]</a></sup></p>
                </div>
                <div className="timeline-item" data-num="3">
                  <div className="tl-year">2025年</div>
                  <p>中国将6G纳入《政府工作报告》，工信部推进6G研发<sup><a href="#cite-7">[7]</a></sup></p>
                </div>
                <div className="timeline-item" data-num="4">
                  <div className="tl-year">2028-2029年</div>
                  <p>6G标准制定关键期</p>
                </div>
                <div className="timeline-item" data-num="5">
                  <div className="tl-year">2030年及以后</div>
                  <p>6G商用部署</p>
                </div>
              </div>
            </section>

            {/* Section 7: 挑战与风险 */}
            <section id="sec-7">
              <div className="section-num">CHAPTER 07</div>
              <h2>挑战与风险</h2>

              <h3>7.1 技术挑战</h3>
              <div className="grid-4">
                <div className="card">
                  <h4>高频段传播损耗</h4>
                  <p>毫米波/太赫兹频段穿透损耗大，覆盖半径小</p>
                </div>
                <div className="card">
                  <h4>RIS硬件可靠性</h4>
                  <p>PIN管/液晶材料长期运行稳定性待验证</p>
                </div>
                <div className="card">
                  <h4>信道估计复杂度</h4>
                  <p>BS-RIS-UE级联信道估计困难，导频开销大</p>
                </div>
                <div className="card">
                  <h4>功耗与散热</h4>
                  <p>Massive MIMO AAU功耗显著高于传统架构</p>
                </div>
              </div>

              <h3>7.2 市场与供应链风险</h3>
              <div className="callout warn">
                <span className="callout-icon">&#9888;</span>
                <strong>&#9888; 地缘政治风险</strong>
                <p>华为、中兴在海外市场的受限影响全球份额。高端射频芯片（PA/LNA）仍依赖海外供应商（高通、博通等），自主可控是下一步重点。</p>
              </div>
            </section>

            {/* Section 8: 未来展望 */}
            <section id="sec-8">
              <div className="section-num">CHAPTER 08</div>
              <h2>未来展望</h2>

              <h3>六大趋势判断</h3>
              <ol>
                <li><span className="key">Massive MIMO持续演进</span> &mdash; 通道数从64T64R向192T192R甚至更高演进，AAU市场CAGR 21.0%<sup><a href="#cite-3">[3]</a></sup></li>
                <li><span className="key">RIS从实验室走向商用</span> &mdash; 预计2026-2027年小规模商用，2030年后成为6G标配</li>
                <li><span className="key">卫星天线成新蓝海</span> &mdash; LEO星座建设驱动相控阵天线市场CAGR 44.2%<sup><a href="#cite-4">[4]</a></sup></li>
                <li><span className="key">AI深度融合</span> &mdash; AI辅助波束管理、信道估计将成为5G-A/6G天线标配能力</li>
                <li><span className="key">通感一体化</span> &mdash; 天线同时支持通信和感知功能，开辟新应用场景</li>
                <li><span className="key">国产化替代加速</span> &mdash; 中国天线企业全球份额持续提升</li>
              </ol>

              <h3>重点关注企业</h3>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>企业</th><th>投资逻辑</th></tr></thead>
                  <tbody>
                    <tr><td>华为</td><td>5G/5G-A/6G全栈技术领先，天线自研自产</td></tr>
                    <tr><td>中兴通讯</td><td>自研自产一体化，Dynamic RIS 2.0领先</td></tr>
                    <tr><td>通宇通讯</td><td>全球基站天线前五，受益5G-A升级周期</td></tr>
                    <tr><td>信维通信</td><td>终端天线龙头，拓展卫星/汽车天线</td></tr>
                    <tr><td>盛路通信</td><td>689项RIS专利储备，卫星/军工双轮驱动</td></tr>
                    <tr><td>Commscope</td><td>全球无源天线龙头，受益5G-A升级</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 9: 结论 */}
            <section id="sec-9">
              <div className="conclusion-box" ref={conclusionRef}>
                <div className="particles">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <span key={i} className="particle"></span>
                  ))}
                </div>
                <div className="section-num" style={{ color: '#67e8f9' }}>CHAPTER 09</div>
                <h2>结论</h2>
                <p style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>全球天线行业正处于<span style={{ color: '#67e8f9', fontWeight: '700' }}>历史性转折点</span>：</p>
                <ul>
                  <li><strong>短期（2024-2026）</strong>：5G建设高峰期已过，但5G-A商用化带来Massive MIMO AAU升级周期，市场结构性增长</li>
                  <li><strong>中期（2026-2028）</strong>：RIS技术从小规模试点走向商用，卫星相控阵天线需求爆发</li>
                  <li><strong>长期（2028-2030+）</strong>：6G标准制定完成，太赫兹天线、智能超表面、空天地一体化天线成为主流</li>
                </ul>
                <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.8rem' }}>中国企业在全球天线产业链中的地位持续提升，华为、中兴、通宇通讯等已具备全球竞争力。未来竞争焦点将从"硬件制造"转向"AI+天线"的系统级创新能力。</p>
              </div>
            </section>

          </div> {/* /content */}
        {/* Sources Footer */}
        <footer>
          <div className="sources">
            <h2>参考资料</h2>
            <ol>
              <li id="cite-1"><span className="src-title">[二级资料] 全球天线行业市场规模：2024年320.53亿元，2030年预测484.26亿元，CAGR 7.12%</span><span className="src-url">市场研究报告</span></li>
              <li id="cite-2"><span className="src-title">[二级资料] 全球5G天线行业规模及市场占有率分析报告</span><span className="src-url">格隆汇 / QY Research</span></li>
              <li id="cite-3"><span className="src-title">[二级资料] 全球Massive MIMO 5G AAU有源天线单元市场规模报告</span><span className="src-url">格隆汇</span></li>
              <li id="cite-4"><span className="src-title">[二级资料] 全球与中国5G相控阵天线市场调查报告2024-2030</span><span className="src-url">QYR恒州博智</span></li>
              <li id="cite-5"><span className="src-title">[二级资料] Technavio: 2024-2028全球5G设备市场增长1469.5亿美元</span><span className="src-url">Technavio Research</span></li>
              <li id="cite-6"><span className="src-title">[行业报道] 华为李鹏MWC2024: 2024年是5G-A商用元年，全球5G用户超15亿</span><span className="src-url">华为官方新闻稿</span></li>
              <li id="cite-7"><span className="src-title">[官方] 2025年中国《政府工作报告》将6G纳入未来产业规划，工信部推进6G研发</span><span className="src-url">中国政府网</span></li>
              <li id="cite-8"><span className="src-title">[二级资料] 2024年中国天线市场竞争格局：华为29.4%、中兴18.6%、通宇14.2%</span><span className="src-url">豆丁网行业分析</span></li>
              <li id="cite-9"><span className="src-title">[行业报道] 通宇通讯: 全球基站天线细分领域前五，华为/中兴/爱立信/诺基亚供应商</span><span className="src-url">腾讯证券</span></li>
              <li id="cite-10"><span className="src-title">[行业报道] 盛路通信: 689项RIS相关发明专利，低轨卫星通信终端天线</span><span className="src-url">搜狐财经</span></li>
              <li id="cite-11"><span className="src-title">[二级资料] 面向6G的大规模MIMO通信感知一体化: 智能超表面(RIS)被认为是6G关键技术之一</span><span className="src-url">搜狐学术</span></li>
              <li id="cite-12"><span className="src-title">[学术] Engineering 2026年1月刊: AI与深度学习在太赫兹超大规模MIMO系统中的应用</span><span className="src-url">Engineering期刊</span></li>
            </ol>
          </div>
        </footer>
        </div> {/* /main-area */}
      </div> {/* /layout */}
    </>
  )
}

const CSS = `
:root {
  --bg: #f8f9fb;
  --bg2: #ffffff;
  --bg-alt: #f1f3f7;
  --ink: #0a0f1e;
  --muted: #5b6a8a;
  --rule: #dce1eb;
  --accent: #2563eb;
  --accent-light: #eef3ff;
  --accent2: #06b6d4;
  --accent2-light: #ecfeff;
  --accent3: #6d28d9;
  --accent3-light: #ede9fe;
  --warn: #f59e0b;
  --warn-light: #fffbeb;
  --sidebar-w: 260px;
  --radius: 14px;
  --radius-sm: 10px;
  --shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03);
  --shadow-md: 0 6px 24px rgba(0,0,0,0.07);
  --shadow-lg: 0 12px 48px rgba(0,0,0,0.10);
}

html { scroll-behavior: smooth; }
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'DM Sans', 'Noto Sans SC', system-ui, sans-serif;
  background: var(--bg);
  color: var(--ink);
  font-size: 14.5px;
  line-height: 1.85;
  background-image:
    radial-gradient(circle at 1px 1px, rgba(37,99,235,0.025) 1px, transparent 0);
  background-size: 28px 28px;
}

/* ===== SIDEBAR ===== */
.sidebar {
  position: sticky;
  top: 60px;
  left: 0;
  width: var(--sidebar-w);
  height: calc(100vh - 60px);
  flex-shrink: 0;
  align-self: flex-start;
  background: rgba(255,255,255,0.82);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid rgba(220,225,235,0.6);
  overflow-y: auto;
  z-index: 100;
  padding: 0 0 2rem;
  scrollbar-width: thin;
  scrollbar-color: var(--rule) transparent;
  transition: width 0.3s ease;
}
.sidebar::-webkit-scrollbar { width: 4px; }
.sidebar::-webkit-scrollbar-thumb { background: var(--rule); border-radius: 2px; }

.sidebar-progress {
  position: sticky;
  top: 0;
  height: 3px;
  background: rgba(220,225,235,0.5);
  z-index: 2;
}
.sidebar-progress-bar {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, var(--accent), var(--accent2));
  border-radius: 0 2px 2px 0;
  transition: width 0.15s ease-out;
}

.sidebar-title {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 1.2rem 1.5rem 0.8rem;
  margin: 0;
  position: relative;
}

.sidebar-nav { list-style: none; padding: 0.5rem 0 0; }

.sidebar-nav li a {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.45rem 1.5rem;
  font-size: 0.78rem;
  color: var(--muted);
  text-decoration: none;
  border-left: 3px solid transparent;
  transition: all 0.25s ease;
  position: relative;
}

.sidebar-nav li a:hover {
  color: var(--accent);
  background: rgba(37,99,235,0.04);
}

.sidebar-nav li a.active {
  color: var(--accent);
  font-weight: 600;
  border-left-color: transparent;
  background: linear-gradient(90deg, rgba(37,99,235,0.08), rgba(6,182,212,0.04));
  position: relative;
}
.sidebar-nav li a.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: linear-gradient(180deg, var(--accent), var(--accent2));
  box-shadow: 0 0 8px rgba(37,99,235,0.3);
}

.sidebar-nav .nav-chap {
  font-family: 'DM Sans', monospace;
  font-weight: 700;
  font-size: 0.62rem;
  color: var(--accent);
  background: var(--accent-light);
  width: 26px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  white-space: nowrap;
  opacity: 0.5;
  flex-shrink: 0;
  letter-spacing: 0;
}

.sidebar-nav li a.active .nav-chap {
  opacity: 1;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #fff;
  box-shadow: 0 2px 6px rgba(37,99,235,0.25);
}

.sidebar-nav .nav-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-nav li.sub a {
  padding-left: 2.8rem;
  font-size: 0.72rem;
}
.sidebar-nav li.sub a .nav-chap { display: none; }

/* ===== HOME HEADER (整行，目录在其下方) ===== */
.home-header {
  max-width: 1320px;
  margin: 0 auto;
  padding: 1.5rem 0 0;
}

/* ===== LAYOUT ===== */
.layout {
  display: flex;
  max-width: 1320px;
  margin: 0 auto;
  gap: 1.5rem;
  min-height: 100vh;
}
.main-area { flex: 1; min-width: 0; }

/* ===== COVER ===== */
/* ===== CONTENT ===== */
.content {
  max-width: 1000px;
  margin: 0;
  padding: 0 2rem 0 0;
}

/* ===== KPI STRIP ===== */
.kpi-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin: 2rem 0 3.5rem;
  position: relative;
  z-index: 3;
  margin-top: -1.5rem;
}

.kpi-card {
  background: var(--bg2);
  border-radius: var(--radius);
  padding: 1.4rem 1rem 1.2rem;
  text-align: center;
  box-shadow: var(--shadow);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  overflow: hidden;
  background-clip: padding-box;
  border: 2px solid transparent;
  background-origin: border-box;
  background-image:
    linear-gradient(var(--bg2), var(--bg2)),
    linear-gradient(135deg, var(--accent), var(--accent2));
  background-origin: border-box;
  background-clip: padding-box, border-box;
}

.kpi-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 40px rgba(37,99,235,0.12), 0 4px 16px rgba(0,0,0,0.06);
}

.kpi-icon {
  font-size: 1rem;
  margin-bottom: 0.3rem;
  opacity: 0.7;
  display: block;
}

.kpi-number {
  font-family: 'DM Sans', 'Noto Sans SC', sans-serif;
  font-size: 1.9rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 0.3rem;
  letter-spacing: -0.02em;
}
.kpi-number.blue {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.kpi-number.green {
  background: linear-gradient(135deg, #06b6d4, #0891b2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.kpi-number.orange {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.kpi-number.purple {
  background: linear-gradient(135deg, #6d28d9, #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.kpi-label {
  font-size: 0.68rem;
  color: var(--muted);
  line-height: 1.4;
  font-weight: 400;
}

/* ===== SECTIONS ===== */
section {
  padding: 3rem 0;
  border-bottom: 1px solid var(--rule);
}
section:first-of-type { padding-top: 1rem; }
section:last-of-type { border-bottom: none; }

.section-num {
  font-family: 'DM Sans', sans-serif;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--accent2);
  margin-bottom: 0.4rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.section-num::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--rule), transparent);
}

h2 {
  font-family: 'Noto Sans SC', sans-serif;
  font-weight: 700;
  font-size: 1.45rem;
  line-height: 1.35;
  margin-bottom: 1.2rem;
  color: var(--ink);
  letter-spacing: -0.01em;
}

h3 {
  font-family: 'Noto Sans SC', sans-serif;
  font-weight: 600;
  font-size: 1.05rem;
  margin: 2rem 0 0.7rem;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

h4 {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 1.2rem 0 0.4rem;
  color: var(--ink);
}

p { margin-bottom: 0.8rem; line-height: 1.85; }
ol { margin-bottom: 0.8rem; }
ol li { margin-bottom: 0.5rem; line-height: 1.85; }
ul { margin-bottom: 0.8rem; }
ul li { margin-bottom: 0.35rem; line-height: 1.85; }

.key {
  background: linear-gradient(to bottom, transparent 60%, var(--accent2-light) 60%);
  font-weight: 600;
  color: var(--accent2);
}

/* ===== TABLES ===== */
.table-wrap {
  overflow-x: auto;
  margin: 1rem 0;
  border-radius: var(--radius);
  border: 1px solid var(--rule);
  box-shadow: var(--shadow);
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

th {
  background: linear-gradient(135deg, #0a0f1e, #162040);
  color: #fff;
  font-weight: 600;
  text-align: left;
  padding: 0.65rem 1rem;
  white-space: nowrap;
  font-size: 0.78rem;
  letter-spacing: 0.03em;
}

td {
  padding: 0.6rem 1rem;
  border-bottom: 1px solid var(--rule);
  color: var(--ink);
  transition: background 0.2s ease;
}

tr:last-child td { border-bottom: none; }
tr:nth-child(even) td { background: rgba(248,249,251,0.8); }
tr:hover td {
  background: rgba(238,243,255,0.7);
  box-shadow: inset 0 0 0 9999px rgba(37,99,235,0.03);
}

/* ===== CALLOUT BOXES ===== */
.callout {
  padding: 1rem 1.2rem;
  margin: 1.2rem 0;
  border-radius: var(--radius-sm);
  border-left: 4px solid;
  font-size: 0.84rem;
  box-shadow: var(--shadow);
  position: relative;
  overflow: hidden;
}

.callout.info {
  background: linear-gradient(135deg, #eef3ff, #ecfeff);
  border-color: var(--accent);
}
.callout.success {
  background: linear-gradient(135deg, #ecfeff, #f0fdf4);
  border-color: var(--accent2);
}
.callout.warn {
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border-color: var(--warn);
}

.callout-icon {
  position: absolute;
  right: 1rem;
  top: 0.8rem;
  font-size: 1.4rem;
  opacity: 0.15;
}

.callout strong {
  display: block;
  font-size: 0.82rem;
  margin-bottom: 0.2rem;
}
.callout.info strong { color: var(--accent); }
.callout.success strong { color: var(--accent2); }
.callout.warn strong { color: var(--warn); }

.callout p {
  font-size: 0.82rem;
  color: var(--ink);
  margin: 0;
  line-height: 1.7;
}

/* ===== CHARTS ===== */
.chart-box {
  background: linear-gradient(135deg, #ffffff, #f8fafc);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
  padding: 1.5rem 1.5rem 1rem;
  margin: 2rem 0;
  box-shadow: var(--shadow-md);
  transition: box-shadow 0.3s ease;
  position: relative;
  overflow: hidden;
}
.chart-box::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--accent), var(--accent2), var(--accent3));
  opacity: 0.6;
  border-radius: var(--radius) var(--radius) 0 0;
}
.chart-box:hover {
  box-shadow: var(--shadow-lg);
}

.chart-box figcaption {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.chart-box figcaption::before {
  content: '';
  width: 4px;
  height: 18px;
  background: linear-gradient(to bottom, var(--accent), var(--accent2));
  border-radius: 2px;
}

/* ===== TIMELINE ===== */
.timeline {
  position: relative;
  padding-left: 2.2rem;
  margin: 1.5rem 0;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: linear-gradient(to bottom, var(--accent2), var(--accent), var(--accent3));
  border-radius: 1px;
  box-shadow: 0 0 8px rgba(6,182,212,0.15);
}
.timeline-item {
  position: relative;
  margin-bottom: 1.2rem;
  padding-left: 0.5rem;
}
.timeline-item:last-child { margin-bottom: 0; }
.timeline-item::before {
  content: attr(data-num);
  position: absolute;
  left: -2.2rem;
  top: 0.1rem;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #fff;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.6rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  box-shadow: 0 2px 8px rgba(37,99,235,0.25);
  line-height: 1;
}
.timeline-item .tl-year {
  font-family: 'Noto Sans SC', sans-serif;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--accent2);
  margin-bottom: 0.15rem;
}
.timeline-item p {
  font-size: 0.82rem;
  color: var(--muted);
  margin: 0;
  line-height: 1.65;
}

/* ===== GRID CARDS ===== */
.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin: 1.2rem 0;
}
.grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin: 1.2rem 0;
}

.card {
  background: var(--bg2);
  border: 1px solid var(--rule);
  border-radius: var(--radius-sm);
  padding: 1.1rem 1rem;
  box-shadow: var(--shadow);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  overflow: hidden;
  border-top: 3px solid var(--rule);
}
.card:nth-child(4n+1) { border-top-color: var(--accent); }
.card:nth-child(4n+2) { border-top-color: var(--accent2); }
.card:nth-child(4n+3) { border-top-color: var(--warn); }
.card:nth-child(4n+4) { border-top-color: var(--accent3); }

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(0,0,0,0.08);
}

.card h4 {
  margin-top: 0;
  font-size: 0.85rem;
  color: var(--accent);
}
.card p, .card li {
  font-size: 0.78rem;
  color: var(--muted);
  line-height: 1.6;
}
.card ul { list-style: none; padding: 0; }
.card li {
  padding: 0.3rem 0;
  border-bottom: 1px solid #f1f3f5;
}
.card li:last-child { border-bottom: none; }
.card li::before {
  content: '\\2192 ';
  color: var(--accent2);
  font-weight: 600;
}

/* ===== CONCLUSION ===== */
.conclusion-box {
  background: linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 40%, #0e2a4a 70%, #0a3040 100%);
  color: #fff;
  border-radius: var(--radius);
  padding: 2.5rem 2.2rem;
  margin: 2.5rem 0;
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
}

.conclusion-box .particles {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}
.conclusion-box .particle {
  position: absolute;
  width: 2px;
  height: 2px;
  background: rgba(103,232,249,0.5);
  border-radius: 50%;
  animation: particleFloat 6s ease-in-out infinite;
}
.conclusion-box .particle:nth-child(1) { left: 10%; top: 20%; animation-delay: 0s; animation-duration: 7s; }
.conclusion-box .particle:nth-child(2) { left: 25%; top: 60%; animation-delay: 1s; animation-duration: 5s; }
.conclusion-box .particle:nth-child(3) { left: 45%; top: 15%; animation-delay: 2s; animation-duration: 8s; }
.conclusion-box .particle:nth-child(4) { left: 60%; top: 75%; animation-delay: 0.5s; animation-duration: 6s; }
.conclusion-box .particle:nth-child(5) { left: 75%; top: 30%; animation-delay: 1.5s; animation-duration: 7.5s; }
.conclusion-box .particle:nth-child(6) { left: 85%; top: 55%; animation-delay: 3s; animation-duration: 5.5s; }
.conclusion-box .particle:nth-child(7) { left: 15%; top: 80%; animation-delay: 2.5s; animation-duration: 6.5s; }
.conclusion-box .particle:nth-child(8) { left: 50%; top: 45%; animation-delay: 0.8s; animation-duration: 9s; }
.conclusion-box .particle:nth-child(9) { left: 90%; top: 10%; animation-delay: 1.8s; animation-duration: 7s; }
.conclusion-box .particle:nth-child(10) { left: 35%; top: 90%; animation-delay: 3.5s; animation-duration: 6s; }
.conclusion-box .particle:nth-child(11) { left: 70%; top: 5%; animation-delay: 0.3s; animation-duration: 8s; width: 3px; height: 3px; }
.conclusion-box .particle:nth-child(12) { left: 5%; top: 50%; animation-delay: 2.2s; animation-duration: 5s; width: 3px; height: 3px; }

@keyframes particleFloat {
  0%, 100% { opacity: 0; transform: translateY(0); }
  20% { opacity: 1; }
  80% { opacity: 0.8; }
  50% { transform: translateY(-20px) translateX(5px); }
}

.conclusion-box::before {
  content: '';
  position: absolute;
  top: -60px;
  right: -60px;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(6,182,212,0.15), transparent 70%);
  border-radius: 50%;
}
.conclusion-box::after {
  content: '';
  position: absolute;
  bottom: -40px;
  left: -40px;
  width: 150px;
  height: 150px;
  background: radial-gradient(circle, rgba(109,40,217,0.1), transparent 70%);
  border-radius: 50%;
}
.conclusion-box h2 {
  color: #fff;
  border-bottom: none;
  margin-bottom: 1rem;
  position: relative;
  z-index: 1;
}
.conclusion-box p { color: rgba(255,255,255,0.8); position: relative; z-index: 1; }
.conclusion-box ul {
  list-style: none;
  padding: 0;
  position: relative;
  z-index: 1;
}
.conclusion-box li {
  padding: 0.55rem 0;
  padding-left: 1.4rem;
  position: relative;
  font-size: 0.88rem;
  color: rgba(255,255,255,0.9);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  line-height: 1.7;
}
.conclusion-box li:last-child { border-bottom: none; }
.conclusion-box li::before {
  content: '\\25C6';
  position: absolute;
  left: 0;
  color: #67e8f9;
  font-size: 0.5rem;
  top: 0.7rem;
}

/* ===== FOOTER ===== */
footer {
  margin-top: 2.5rem;
  padding: 2rem 0 2.5rem;
  border-top: 1px solid var(--rule);
}
footer .sources {
  max-width: 1000px;
  margin: 0;
  padding: 0 2rem 0 0;
}
footer .sources h2 {
  font-size: 0.9rem;
  border-bottom: none;
  margin-bottom: 0.8rem;
  color: var(--muted);
  letter-spacing: 0.05em;
}
footer .sources ol {
  padding-left: 1.4rem;
  font-size: 0.72rem;
  color: var(--muted);
  line-height: 1.6;
}
footer .sources li { margin-bottom: 0.5rem; overflow-wrap: break-word; word-break: break-all; }
footer .sources .src-title { color: var(--ink); font-weight: 500; }
footer .sources .src-url {
  display: block;
  margin-top: 0.08rem;
  font-size: 0.68rem;
  color: var(--accent);
  word-break: break-all;
}

sup a {
  color: var(--accent);
  text-decoration: none;
  font-size: 0.7em;
  font-weight: 700;
}
sup a:hover { text-decoration: underline; }

/* ===== MOBILE SIDEBAR ===== */
.sidebar-mobile-btn {
  display: none;
  position: fixed;
  bottom: 1.2rem;
  right: 1.2rem;
  z-index: 200;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #fff;
  border: none;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(37,99,235,0.3);
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.sidebar-mobile-btn:hover { transform: scale(1.08); opacity: 0.9; }
.sidebar-overlay { display: none; }

/* ===== RESPONSIVE ===== */
@media (max-width: 1024px) {
  :root { --sidebar-w: 200px; }
  .layout { gap: 1rem; }
  .kpi-strip { grid-template-columns: repeat(2, 1fr); }
  .grid-4 { grid-template-columns: 1fr 1fr; }
  .content { padding: 0 2rem; }
  footer .sources { padding: 0 2rem; }
}

@media (max-width: 768px) {
  .sidebar { display: none; }
  .sidebar.mobile-open {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    width: 75vw;
    max-width: 300px;
    height: 100vh;
    z-index: 101;
  }
  .sidebar-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.3);
    z-index: 99;
    backdrop-filter: blur(2px);
  }
  .sidebar-overlay.show { display: block; }
  .sidebar-mobile-btn { display: flex; }

  .layout { margin-left: 0; }
  .content { padding: 0 1rem; }
  .kpi-strip { grid-template-columns: 1fr 1fr; gap: 0.6rem; margin-top: -1rem; }
  .grid-2, .grid-4 { grid-template-columns: 1fr; }
  footer .sources { padding: 0 1rem; }
  table { font-size: 0.72rem; }
  th, td { padding: 0.4rem 0.6rem; }
  .conclusion-box { padding: 1.5rem 1.2rem; }
  h2 { font-size: 1.2rem; }
  section { padding: 2rem 0; }
}

@media (min-width: 769px) {
  .sidebar-mobile-btn { display: none !important; }
  .sidebar-overlay { display: none !important; }
}

@media print {
  .chart-box { break-inside: avoid; }
  section { break-inside: avoid; }
}
`
