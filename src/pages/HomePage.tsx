import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { WorkCard } from '../components/WorkCard'
import { getWorks } from '../lib/api'
import type { Work } from '../types'

export function HomePage() {
  const [works, setWorks] = useState<Work[]>([])

  useEffect(() => {
    getWorks().then(setWorks).catch(() => setWorks([]))
  }, [])

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="kicker">AUTOSTEREOGRAM STUDIO · 2026</span>
          <h1>把平面图像<br />藏进<span>视觉深处</span></h1>
          <p>
            上传纹理与主体，Depthloom 会在浏览器中将深度编码进一张单幅图像。
            放松双眼，穿过画面，你会看到它浮现。
          </p>
          <div className="hero-actions">
            <Link className="primary-button" to="/create">开始制作 <span>→</span></Link>
            <Link className="secondary-button" to="/guide">先学会怎么看</Link>
          </div>
          <div className="hero-facts">
            <span><b>LOCAL</b> 本地生成</span>
            <span><b>HD</b> 高清导出</span>
            <span><b>FREE</b> 无需付费 API</span>
          </div>
        </div>
        <div className="hero-visual" aria-label="裸眼立体画视觉示意">
          <div className="orbital-ring ring-one" />
          <div className="orbital-ring ring-two" />
          <div className="depth-object">
            <i /><i /><i /><i /><i />
          </div>
          <div className="focus-points"><span /><span /></div>
          <p>让两个标记在视野中重合</p>
        </div>
      </section>

      <section className="process-section">
        <div className="section-intro">
          <span className="kicker">HOW IT WORKS</span>
          <h2>两张图，三个步骤</h2>
          <p>它不是滤镜。我们将主体转换为深度约束，再逐行重组纹理像素。</p>
        </div>
        <div className="process-grid">
          <article><span>01</span><b>纹理</b><h3>上传背景图</h3><p>细节丰富的图片会带来更清晰、稳定的立体效果。</p></article>
          <article><span>02</span><b>深度</b><h3>上传主体图</h3><p>亮部向前、暗部向后，也可以一键反转深度方向。</p></article>
          <article><span>03</span><b>视差</b><h3>生成并凝视</h3><p>视线穿过图片，水平纹理会在大脑中合成为立体结构。</p></article>
        </div>
      </section>

      <section className="home-gallery">
        <div className="gallery-heading">
          <div><span className="kicker">COMMUNITY ARCHIVE</span><h2>最近浮现的作品</h2></div>
          <Link to="/gallery">浏览全部作品 →</Link>
        </div>
        {works.length ? (
          <div className="work-grid">
            {works.slice(0, 6).map((work, index) => <WorkCard key={work.id} work={work} featured={index === 0} />)}
          </div>
        ) : (
          <div className="empty-gallery">
            <div className="empty-pattern" />
            <h3>画廊正在等待第一件作品</h3>
            <p>你的作品可以只下载到本地，也可以自愿发布到这里。</p>
            <Link className="primary-button" to="/create">成为第一位创作者 →</Link>
          </div>
        )}
      </section>
    </>
  )
}
