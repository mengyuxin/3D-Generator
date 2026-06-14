import { NavLink, Route, Routes } from 'react-router-dom'
import { CreatePage } from './pages/CreatePage'
import { GalleryPage } from './pages/GalleryPage'
import { GuidePage } from './pages/GuidePage'
import { HomePage } from './pages/HomePage'
import { ManagePage } from './pages/ManagePage'
import { WorkPage } from './pages/WorkPage'

function Logo() {
  return (
    <NavLink className="brand" to="/" aria-label="Depthloom 首页">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>
        <strong>DEPTHLOOM</strong>
        <small>裸眼立体画实验室</small>
      </span>
    </NavLink>
  )
}

export default function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Logo />
        <nav className="main-nav" aria-label="主导航">
          <NavLink to="/create">开始制作</NavLink>
          <NavLink to="/gallery">作品画廊</NavLink>
          <NavLink to="/guide">观看指南</NavLink>
        </nav>
        <NavLink className="header-action" to="/create">
          打开实验台 <span>↗</span>
        </NavLink>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/works/:id" element={<WorkPage />} />
          <Route path="/manage/:id/:token" element={<ManagePage />} />
          <Route path="/guide" element={<GuidePage />} />
        </Routes>
      </main>

      <footer className="site-footer">
        <Logo />
        <p>图片默认只在你的浏览器中处理。只有主动发布，作品才会上传到画廊。</p>
        <div>
          <NavLink to="/guide">原理与观看</NavLink>
          <span>© 2026 Depthloom</span>
        </div>
      </footer>
    </div>
  )
}
