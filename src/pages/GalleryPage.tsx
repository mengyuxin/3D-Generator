import { useEffect, useState } from 'react'
import { WorkCard } from '../components/WorkCard'
import { getWorks } from '../lib/api'
import type { Work } from '../types'

export function GalleryPage() {
  const [sort, setSort] = useState('latest')
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getWorks(sort).then(setWorks).finally(() => setLoading(false))
  }, [sort])

  return (
    <div className="page-container gallery-page">
      <header className="page-title">
        <span className="kicker">COMMUNITY ARCHIVE</span>
        <h1>作品画廊</h1>
        <p>这里展示创作者明确同意公开的最终作品，原始素材不会被上传。</p>
      </header>
      <div className="gallery-toolbar">
        <div className="filter-tabs">
          <button className={sort === 'latest' ? 'active' : ''} onClick={() => setSort('latest')}>最新</button>
          <button className={sort === 'popular' ? 'active' : ''} onClick={() => setSort('popular')}>最受欢迎</button>
          <button className={sort === 'liked' ? 'active' : ''} onClick={() => setSort('liked')}>最多点赞</button>
        </div>
        <span>{works.length} 件公开作品</span>
      </div>
      {loading ? (
        <div className="loading-state">正在读取光学档案…</div>
      ) : works.length ? (
        <div className="work-grid">{works.map((work) => <WorkCard key={work.id} work={work} />)}</div>
      ) : (
        <div className="empty-gallery"><h3>还没有公开作品</h3><p>画廊只收录用户主动发布的成品。</p></div>
      )}
    </div>
  )
}
