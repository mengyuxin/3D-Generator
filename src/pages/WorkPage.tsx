import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getWork, likeWork, recordWorkView } from '../lib/api'
import type { Work } from '../types'

export function WorkPage() {
  const { id = '' } = useParams()
  const [work, setWork] = useState<Work | null>(null)
  const [error, setError] = useState('')
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    getWork(id)
      .then(async (loadedWork) => {
        const viewKey = `depthloom:viewed:${id}`
        if (!sessionStorage.getItem(viewKey)) {
          sessionStorage.setItem(viewKey, 'true')
          const result = await recordWorkView(id)
          loadedWork.views = result.views
        }
        setWork(loadedWork)
      })
      .catch((caught) => setError(caught.message))
  }, [id])

  if (error) return <div className="page-container loading-state">{error}</div>
  if (!work) return <div className="page-container loading-state">正在显影作品…</div>

  return (
    <div className="work-page page-container">
      <header className="work-header">
        <div>
          <Link to="/gallery">← 返回画廊</Link>
          <span className="kicker">{work.category} / {new Date(work.createdAt).toLocaleDateString('zh-CN')}</span>
          <h1>{work.title}</h1>
          <p>由 {work.author} 创作</p>
        </div>
        <div className="detail-stats">
          <span><b>{work.views}</b> 浏览</span>
          <button onClick={async () => {
            const result = await likeWork(work.id)
            setWork({ ...work, likes: result.likes })
          }}><b>♥ {work.likes}</b> 喜欢</button>
        </div>
      </header>

      <figure className="work-viewer">
        <div className="viewer-dots"><span /><span /></div>
        <img src={work.imageUrl} alt={work.title} onClick={() => setFullscreen(true)} />
        <figcaption>点击图片进入全屏 · 放松焦点，让视线穿过画面</figcaption>
      </figure>

      <div className="work-information">
        <section>
          <span className="kicker">ABOUT THIS WORK</span>
          <h2>作品说明</h2>
          <p>{work.description || '创作者没有留下说明。试着在纹理中寻找隐藏的深度结构。'}</p>
          <div className="tag-list">{work.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
        </section>
        <aside>
          <dl>
            <div><dt>尺寸</dt><dd>{work.width} × {work.height}</dd></div>
            <div><dt>格式</dt><dd>单幅裸眼立体画</dd></div>
            <div><dt>观看方式</dt><dd>平行眼</dd></div>
            {work.source && <div><dt>创作来源</dt><dd>{work.source}</dd></div>}
          </dl>
          {work.sourceUrl && (
            <a className="source-link" href={work.sourceUrl} target="_blank" rel="noreferrer">
              查看来源页面 ↗
            </a>
          )}
          {work.allowDownload && <a className="primary-button" href={work.imageUrl} download={`${work.title}.png`}>下载作品 ↓</a>}
        </aside>
      </div>

      {fullscreen && (
        <div className="fullscreen-viewer" onClick={() => setFullscreen(false)}>
          <button>关闭 ×</button>
          <img src={work.imageUrl} alt={work.title} />
        </div>
      )}
    </div>
  )
}
