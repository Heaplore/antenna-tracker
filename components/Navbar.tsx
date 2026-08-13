'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import GlobalSearch from '@/components/GlobalSearch'
import SearchTrigger from '@/components/SearchTrigger'

export default function Navbar() {
  const pathname = usePathname()
  // Static export with basePath: '/antenna-tracker' means pathname includes the base path
  // e.g. '/antenna-tracker/news/' not '/news'
  const isActive = (path: string) => {
    const normalized = pathname?.replace(/^\/antenna-tracker/, '') || '/'
    const target = path === '/' ? '/' : `/${path.replace(/^\//, '')}`
    return normalized === target || normalized.startsWith(target + '/')
  }
  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <Link href="/" className="navbar-brand">📡 天线情报</Link>
          <div className="navbar-nav">
            <Link href="/news" className={`nav-link${isActive('/news') ? ' active' : ''}`}>行业动态</Link>
            <Link href="/companies" className={`nav-link${isActive('/companies') ? ' active' : ''}`}>企业</Link>
            <Link href="/prices" className={`nav-link${isActive('/prices') ? ' active' : ''}`}>价格</Link>
            <Link href="/standards" className={`nav-link${isActive('/standards') ? ' active' : ''}`}>标准</Link>
            <Link href="/technology" className={`nav-link${isActive('/technology') ? ' active' : ''}`}>技术</Link>
            <Link href="/knowledge-graph" className={`nav-link${isActive('/knowledge-graph') ? ' active' : ''}`}>知识图谱</Link>
          </div>
          <div className="navbar-search-hint">点击导航栏文字按钮切换页面</div>
          <div className="navbar-search">
            <SearchTrigger />
          </div>
        </div>
      </nav>
      <GlobalSearch />
    </>
  )
}