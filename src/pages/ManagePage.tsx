import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteWork } from '../lib/api'

export function ManagePage() {
  const { id = '', token = '' } = useParams()
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  return (
    <div className="page-container manage-page">
      <span className="kicker">PRIVATE MANAGEMENT LINK</span>
      <h1>作品管理</h1>
      <p>持有此链接的人可以删除对应公开作品。请勿随意分享。</p>
      <div className="manage-card">
        <h2>取消公开并删除作品</h2>
        <p>删除后，作品会立即从画廊和详情页移除，图片文件也会从服务器删除。此操作无法撤销。</p>
        {error && <div className="error-banner">{error}</div>}
        <button
          className="danger-button"
          disabled={deleting}
          onClick={async () => {
            if (!window.confirm('确定永久删除这件作品吗？')) return
            setDeleting(true)
            try {
              await deleteWork(id, token)
              navigate('/gallery', { replace: true })
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : '删除失败')
              setDeleting(false)
            }
          }}
        >
          {deleting ? '正在删除…' : '永久删除作品'}
        </button>
        <Link to={`/works/${id}`}>先查看作品</Link>
      </div>
    </div>
  )
}
