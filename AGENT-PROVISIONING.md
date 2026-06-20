# Antenna Tracker 天线情报追踪系统 - Agent 清单

> **生成日期**: 2026-06-19
> **项目路径**: `E:\OH-workspace\antenna-tracker\`
> **技术栈**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + recharts + JSON 静态数据
> **部署**: Gitee Pages 静态导出 (output: 'export')
> **项目定位**: 天线行业情报展示系统（市场/企业/标准/新闻/价格/技术）

---

## 核心 Agent 清单

### 1. 前端/页面开发

| Agent | 文件 | 触发场景 | 优先级 |
|-------|------|---------|--------|
| **Frontend Developer** | `agents/engineering-frontend-developer.md` | 页面组件开发、Next.js App Router、TypeScript 实现 | P0 |
| **UI Designer** | `agents/design-ui-designer.md` | Tailwind 样式、shadcn/ui 组件、配色、排版 | P0 |
| **UX Architect** | `agents/design-ux-architect.md` | 信息架构、页面导航、Tab 切换、弹窗交互 | P1 |

### 2. 数据可视化

| Agent | 文件 | 触发场景 | 优先级 |
|-------|------|---------|--------|
| **Visual Storyteller** | `agents/design-visual-storyteller.md` | recharts 图表（折线图/饼图/气泡图）、数据可视化设计 | P0 |
| **Senior Developer** | `agents/engineering-senior-developer.md` | 复杂图表交互、Gartner Hype Cycle 气泡图实现 | P1 |

### 3. 数据工程

| Agent | 文件 | 触发场景 | 优先级 |
|-------|------|---------|--------|
| **Data Engineer** | `agents/engineering-data-engineer.md` | JSON 数据建模、数据清洗、ETL 脚本 | P0 |
| **Backend Architect** | `agents/engineering-backend-architect.md` | 数据 API 设计（未来动态化时）、爬虫架构 | P1 |
| **Database Optimizer** | `agents/engineering-database-optimizer.md` | 静态 JSON 数据查询优化、索引设计 | P2 |

### 4. 爬虫与数据采集

| Agent | 文件 | 触发场景 | 优先级 |
|-------|------|---------|--------|
| **Scraper** (需自定义) | — | 行业数据爬取、新闻聚合、企业图谱抓取 | P0 |
| **SEO Specialist** | `agents/marketing-seo-specialist.md` | 行业关键词研究、SEO 优化（如果做公开部署） | P2 |

### 5. 测试与质量

| Agent | 文件 | 触发场景 | 优先级 |
|-------|------|---------|--------|
| **Code Reviewer** | `agents/engineering-code-reviewer.md` | TypeScript/Next.js 代码审查、重构建议 | P0 |
| **Reality Checker** | `agents/testing-reality-checker.md` | 技术方案可行性评估 | P1 |
| **Performance Benchmarker** | `agents/testing-performance-benchmarker.md` | 静态站点性能、Lighthouse 评分优化 | P1 |

### 6. 部署与 DevOps

| Agent | 文件 | 触发场景 | 优先级 |
|-------|------|---------|--------|
| **DevOps Automator** | `agents/engineering-devops-automator.md` | Gitee Pages 部署、CI/CD 配置、GitHub Actions | P0 |
| **Git Workflow Master** | `agents/engineering-git-workflow-master.md` | 版本管理、分支策略 | P2 |

### 7. 产品与架构

| Agent | 文件 | 触发场景 | 优先级 |
|-------|------|---------|--------|
| **Software Architect** | `agents/engineering-software-architect.md` | 系统架构决策、模块拆分、技术选型 | P0 |
| **Product Manager** | `agents/product-manager.md` | 功能优先级、用户需求分析、Roadmap | P1 |

### 8. 搜索与知识

| Agent | 文件 | 触发场景 | 优先级 |
|-------|------|---------|--------|
| **Agentic Search Optimizer** | `agents/marketing-agentic-search-optimizer.md` | 全局搜索功能设计、跨页面搜索 | P1 |
| **Knowledge Graph Engineer** (需自定义) | — | 知识图谱生成与可视化 | P1 |

---

## 触发词映射表（快捷查询）

| 你说... | 我切给... |
|---------|----------|
| "页面""组件""Next.js""TypeScript""路由" | Frontend Developer |
| "样式""Tailwind""shadcn""配色""排版" | UI Designer |
| "图表""折线图""饼图""气泡图""recharts" | Visual Storyteller |
| "JSON""数据模型""数据清洗""ETL" | Data Engineer |
| "爬取""爬虫""数据采集""新闻聚合" | Data Engineer + Backend Architect |
| "部署""Gitee Pages""CI/CD""GitHub Actions" | DevOps Automator |
| "代码审查""review""重构" | Code Reviewer |
| "架构图""模块拆分""技术选型" | Software Architect |
| "搜索""全局搜索""跨页面" | Agentic Search Optimizer |
| "性能""Lighthouse""加载速度" | Performance Benchmarker |
| "功能优先级""需求分析""Roadmap" | Product Manager |
| "项目启动""需求讨论""PRD""MVP" | Product Manager + Business Strategist |
| "任务拆解""工时估算""里程碑" | Senior Project Manager |
| "可行性""风险评估" | Reality Checker |

---

## 待开发功能 Agent 映射

| 待开发功能 | 需要的 Agent |
|-----------|-------------|
| 移动端适配 | Frontend Developer + UI Designer |
| 招标信息详情页 | Frontend Developer + UX Architect |
| 数据自动更新（定时爬取） | Data Engineer + Backend Architect |
| 全局搜索 | Agentic Search Optimizer + Frontend Developer |
| 数据导出（Excel/CSV） | Data Engineer + Frontend Developer |
| 详情弹窗样式美化 | UI Designer + Frontend Developer |
| 知识图谱可视化 | Data Engineer + Visual Storyteller |

---

## 维护记录

| 日期 | 变更 | 操作者 |
|------|------|--------|
| 2026-06-19 | 初始版本，基于 SPEC.md + 框架设计-v1.md | 小紫 |
