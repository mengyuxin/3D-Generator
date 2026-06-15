import { Link } from 'react-router-dom'
import type { Work } from '../types'

export function WorkCard({ work, featured = false }: { work: Work; featured?: boolean }) {
  const latestComment = work.comments?.at(-1)

  return (
    <article className={`work-card ${featured ? 'featured' : ''}`}>
      <Link className="work-image" to={`/works/${work.id}`}>
        <img src={work.thumbnailUrl} alt={work.title} loading="lazy" />
        <span className="view-chip">查看立体画 ↗</span>
      </Link>
      <div className="work-meta">
        <div>
          <h3><Link to={`/works/${work.id}`}>{work.title}</Link></h3>
          <p>{work.author} · {new Date(work.createdAt).toLocaleDateString('zh-CN')}</p>
        </div>
        <div className="work-stats">
          <span>◉ {work.views}</span>
          <span>♥ {work.likes}</span>
          <span>✎ {work.comments?.length ?? 0}</span>
        </div>
      </div>
      <div className="work-comments-strip">
        {latestComment ? (
          <>
            <span>{latestComment.author}</span>
            <p>{latestComment.body}</p>
          </>
        ) : (
          <>
            <span>COMMENT</span>
            <p>还没有评论，点击作品进入详情页留言。</p>
          </>
        )}
      </div>
    </article>
  )
}
