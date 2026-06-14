import { Link } from 'react-router-dom'

export function GuidePage() {
  return (
    <div className="page-container guide-page">
      <header className="page-title">
        <span className="kicker">VIEWING MANUAL</span>
        <h1>不要盯着画面看</h1>
        <p>真正的单幅裸眼立体画，需要双眼把重复纹理中的视差重新组合成深度。</p>
      </header>
      <div className="guide-layout">
        <section className="guide-demo">
          <div className="guide-dots"><span /><span /></div>
          <div className="guide-depth"><b>DEPTH</b></div>
          <p>尝试让上方两个点在视野中变成三个点，并保持中间的点重合。</p>
        </section>
        <div className="guide-steps">
          <article><span>01</span><div><h2>放松焦点</h2><p>不要把焦点锁定在屏幕表面。想象你正在透过一块玻璃看后方。</p></div></article>
          <article><span>02</span><div><h2>看向画面后方</h2><p>缓慢调整视线，让两个辅助点分别分裂，并让中间的两个点重合。</p></div></article>
          <article><span>03</span><div><h2>保持几秒</h2><p>不要追逐局部纹理。保持视线稳定，主体轮廓会逐渐浮出或凹入。</p></div></article>
          <aside>初次观看可能需要 20–60 秒。眼睛疲劳时请停止并休息。</aside>
          <Link className="primary-button" to="/create">现在制作一张 →</Link>
        </div>
      </div>
    </div>
  )
}
