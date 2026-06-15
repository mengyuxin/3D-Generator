import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { publishWork } from '../lib/api'
import type { PublishResult } from '../types'

type LoadedWork = {
  file: File
  image: HTMLImageElement
  url: string
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('无法处理图片')),
      type,
      quality,
    )
  })
}

async function createThumbnail(image: HTMLImageElement) {
  const maximumWidth = 640
  const scale = Math.min(1, maximumWidth / image.naturalWidth)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.naturalWidth * scale)
  canvas.height = Math.round(image.naturalHeight * scale)
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvasToBlob(canvas, 'image/jpeg', 0.84)
}

export function UploadPage() {
  const [loaded, setLoaded] = useState<LoadedWork | null>(null)
  const [dragging, setDragging] = useState(false)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('抽象')
  const [tags, setTags] = useState('')
  const [source, setSource] = useState('其他工具制作')
  const [sourceUrl, setSourceUrl] = useState('')
  const [allowDownload, setAllowDownload] = useState(true)
  const [rightsConfirmed, setRightsConfirmed] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [published, setPublished] = useState<PublishResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => {
    if (loaded) URL.revokeObjectURL(loaded.url)
  }, [loaded])

  function loadFile(file: File) {
    setError('')
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setError('请上传 PNG 或 JPG 图片')
      return
    }
    if (file.size > 4.5 * 1024 * 1024) {
      setError('图片不能超过 4.5 MB')
      return
    }

    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      if (image.naturalWidth < 320 || image.naturalHeight < 240) {
        URL.revokeObjectURL(url)
        setError('图片尺寸至少需要 320 × 240')
        return
      }
      if (image.naturalWidth > 4096 || image.naturalHeight > 4096) {
        URL.revokeObjectURL(url)
        setError('图片长边不能超过 4096 像素')
        return
      }
      setLoaded((current) => {
        if (current) URL.revokeObjectURL(current.url)
        return { file, image, url }
      })
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, '').slice(0, 60))
      setPublished(null)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      setError('图片无法读取，请更换文件')
    }
    image.src = url
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!loaded || !rightsConfirmed) return
    setPublishing(true)
    setError('')
    try {
      const thumbnail = await createThumbnail(loaded.image)
      const form = new FormData()
      form.append('image', loaded.file)
      form.append('thumbnail', thumbnail, 'thumbnail.jpg')
      form.append('title', title)
      form.append('author', author)
      form.append('description', description)
      form.append('category', category)
      form.append('tags', tags)
      form.append('source', source)
      form.append('sourceUrl', sourceUrl)
      form.append('width', String(loaded.image.naturalWidth))
      form.append('height', String(loaded.image.naturalHeight))
      form.append('allowDownload', String(allowDownload))
      form.append('consent', 'true')
      form.append('consentVersion', '2026-06-15-external-upload')
      const result = await publishWork(form)
      setPublished(result)
      localStorage.setItem(
        `depthloom:manage:${result.work.id}`,
        JSON.stringify({ token: result.manageToken, title: result.work.title }),
      )
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '上传失败')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="upload-page page-container">
      <header className="upload-hero">
        <div>
          <span className="kicker">OPEN SUBMISSION / 02</span>
          <h1>上传你的<br /><span>立体作品</span></h1>
        </div>
        <div className="upload-intro">
          <p>已经在其他软件或其他途径制作好了？直接上传成品，让更多人看见。</p>
          <ul>
            <li>仅支持单幅裸眼立体画成品</li>
            <li>PNG / JPG，最大 4.5 MB</li>
            <li>原图不会被再次加工或裁剪</li>
          </ul>
        </div>
      </header>

      <form className="external-upload-layout" onSubmit={submit}>
        <section className="external-work-panel">
          <div className="panel-heading">
            <div><span>ARTWORK FILE</span><h3>作品原图</h3></div>
            {loaded && <button type="button" className="text-button" onClick={() => inputRef.current?.click()}>更换</button>}
          </div>
          <div
            className={`external-dropzone ${dragging ? 'dragging' : ''} ${loaded ? 'has-work' : ''}`}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true) }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              const file = event.dataTransfer.files[0]
              if (file) loadFile(file)
            }}
            onClick={() => inputRef.current?.click()}
          >
            {loaded ? (
              <img src={loaded.url} alt="待上传作品预览" />
            ) : (
              <div>
                <span className="upload-cross">＋</span>
                <h2>拖入立体画成品</h2>
                <p>或点击选择本地文件</p>
                <small>PNG / JPG · 320×240 至 4096×4096</small>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) loadFile(file)
                event.target.value = ''
              }}
            />
          </div>
          {loaded && (
            <div className="file-facts">
              <span>{loaded.file.name}</span>
              <span>{loaded.image.naturalWidth} × {loaded.image.naturalHeight}</span>
              <span>{(loaded.file.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          )}
        </section>

        <section className="submission-panel">
          <div className="panel-heading">
            <div><span>PUBLIC INFORMATION</span><h3>作品资料</h3></div>
            <span className="required-note">* 必填</span>
          </div>

          <label>作品名称 *<input required maxLength={60} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="藏在纹理中的是什么？" /></label>
          <div className="form-row">
            <label>作者昵称<input maxLength={30} value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="匿名创作者" /></label>
            <label>作品分类<select value={category} onChange={(event) => setCategory(event.target.value)}><option>抽象</option><option>人物</option><option>动物</option><option>建筑</option><option>文字</option><option>实验作品</option></select></label>
          </div>
          <label>作品简介<textarea maxLength={300} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="介绍作品内容、观看提示或创作过程…" /></label>
          <label>标签<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="几何, 动物, 蓝色（最多 5 个）" /></label>
          <div className="form-row">
            <label>制作来源
              <select value={source} onChange={(event) => setSource(event.target.value)}>
                <option>其他工具制作</option>
                <option>本人原创制作</option>
                <option>手工绘制</option>
                <option>转载授权作品</option>
                <option>来源未知</option>
              </select>
            </label>
            <label>来源链接<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://（选填）" /></label>
          </div>

          <div className="submission-consent">
            <label>
              <input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} />
              <span>
                <b>我确认拥有公开展示该作品的权利 *</b>
                <small>作品为本人持有、本人原创，或已获得作者授权；我同意将其公开展示在作品画廊。</small>
              </span>
            </label>
            <label className="download-permission">
              <input type="checkbox" checked={allowDownload} onChange={(event) => setAllowDownload(event.target.checked)} />
              <span><b>允许访客下载原图</b><small>关闭后详情页不会显示下载按钮。</small></span>
            </label>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <button className="primary-button upload-submit" disabled={!loaded || !title.trim() || !rightsConfirmed || publishing}>
            {publishing ? '正在上传并发布…' : '上传并发布到画廊 ↑'}
          </button>

          {published && (
            <div className="upload-success">
              <span>PUBLIC</span>
              <div>
                <h2>作品已进入画廊</h2>
                <p>请保存管理链接。持有链接的人可以删除该作品。</p>
              </div>
              <Link to={`/works/${published.work.id}`}>查看作品 →</Link>
              <Link to={`/manage/${published.work.id}/${published.manageToken}`}>打开管理链接</Link>
            </div>
          )}
        </section>
      </form>
    </div>
  )
}
