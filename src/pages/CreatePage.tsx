import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CropEditor } from '../components/CropEditor'
import { RangeControl } from '../components/RangeControl'
import { publishWork } from '../lib/api'
import { drawImageCover } from '../lib/crop'
import type { CropState, GeneratorSettings, PublishResult } from '../types'

const DEFAULT_CROP: CropState = { zoom: 1, x: 0.5, y: 0.5 }
const DEFAULT_SETTINGS: GeneratorSettings = {
  width: 1024,
  height: 768,
  patternWidth: 96,
  depthStrength: 0.72,
  brightness: 0,
  contrast: 0,
  blur: 1,
  invertDepth: false,
  guideDots: true,
}
const SIZE_PRESETS = [
  [800, 600],
  [1024, 768],
  [1280, 720],
  [1920, 1080],
  [1080, 1080],
  [1080, 1440],
]

type LoadedImage = { element: HTMLImageElement; url: string; name: string }

function loadFile(file: File, callback: (image: LoadedImage) => void) {
  const url = URL.createObjectURL(file)
  const element = new Image()
  element.onload = () => callback({ element, url, name: file.name })
  element.onerror = () => URL.revokeObjectURL(url)
  element.src = url
}

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality = 0.92) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('无法创建图片文件')), type, quality)
  })
}

async function createThumbnail(blob: Blob) {
  const image = new Image()
  image.src = URL.createObjectURL(blob)
  await image.decode()
  const maximumWidth = 640
  const scale = Math.min(1, maximumWidth / image.naturalWidth)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.naturalWidth * scale)
  canvas.height = Math.round(image.naturalHeight * scale)
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
  URL.revokeObjectURL(image.src)
  return canvasToBlob(canvas, 'image/jpeg', 0.82)
}

function imageFromCanvas(canvas: HTMLCanvasElement, name: string) {
  return new Promise<LoadedImage>((resolve) => {
    const url = canvas.toDataURL('image/png')
    const element = new Image()
    element.onload = () => resolve({ element, url, name })
    element.src = url
  })
}

export function CreatePage() {
  const [texture, setTexture] = useState<LoadedImage | null>(null)
  const [depth, setDepth] = useState<LoadedImage | null>(null)
  const [textureCrop, setTextureCrop] = useState<CropState>(DEFAULT_CROP)
  const [depthCrop, setDepthCrop] = useState<CropState>(DEFAULT_CROP)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [previewTab, setPreviewTab] = useState<'result' | 'depth' | 'texture'>('result')
  const [resultUrl, setResultUrl] = useState('')
  const [depthPreview, setDepthPreview] = useState('')
  const [texturePreview, setTexturePreview] = useState('')
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [isHighResolution, setIsHighResolution] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [publicConsent, setPublicConsent] = useState(true)
  const [allowDownload, setAllowDownload] = useState(true)
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [published, setPublished] = useState<PublishResult | null>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('抽象')
  const [tags, setTags] = useState('')
  const workerRef = useRef<Worker | null>(null)
  const resultUrlRef = useRef('')

  useEffect(() => () => {
    workerRef.current?.terminate()
    if (texture) URL.revokeObjectURL(texture.url)
    if (depth) URL.revokeObjectURL(depth.url)
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
  }, [texture, depth])

  const aspectRatio = settings.width / settings.height
  const canGenerate = Boolean(texture && depth && !generating)

  async function loadExample() {
    const textureCanvas = document.createElement('canvas')
    textureCanvas.width = 1200
    textureCanvas.height = 900
    const textureContext = textureCanvas.getContext('2d')!
    textureContext.fillStyle = '#183c34'
    textureContext.fillRect(0, 0, textureCanvas.width, textureCanvas.height)
    let seed = 4127
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }
    for (let index = 0; index < 7200; index += 1) {
      const x = random() * textureCanvas.width
      const y = random() * textureCanvas.height
      const size = 1 + random() * 5
      textureContext.fillStyle = index % 5 === 0
        ? `rgba(220,255,63,${0.28 + random() * 0.5})`
        : `rgba(${40 + random() * 90},${90 + random() * 100},${90 + random() * 100},.72)`
      textureContext.fillRect(x, y, size * 2.4, size)
    }

    const depthCanvas = document.createElement('canvas')
    depthCanvas.width = 1200
    depthCanvas.height = 900
    const depthContext = depthCanvas.getContext('2d')!
    const gradient = depthContext.createRadialGradient(600, 450, 40, 600, 450, 380)
    gradient.addColorStop(0, '#fff')
    gradient.addColorStop(0.48, '#c8c8c8')
    gradient.addColorStop(0.5, '#777')
    gradient.addColorStop(1, '#000')
    depthContext.fillStyle = '#000'
    depthContext.fillRect(0, 0, 1200, 900)
    depthContext.fillStyle = gradient
    depthContext.beginPath()
    depthContext.arc(600, 450, 350, 0, Math.PI * 2)
    depthContext.fill()
    depthContext.fillStyle = '#f5f5f5'
    depthContext.font = '900 250px sans-serif'
    depthContext.textAlign = 'center'
    depthContext.textBaseline = 'middle'
    depthContext.fillText('3D', 600, 455)

    const [exampleTexture, exampleDepth] = await Promise.all([
      imageFromCanvas(textureCanvas, '示例纹理.png'),
      imageFromCanvas(depthCanvas, '示例深度.png'),
    ])
    setTexture(exampleTexture)
    setDepth(exampleDepth)
    setTextureCrop(DEFAULT_CROP)
    setDepthCrop(DEFAULT_CROP)
    setIsHighResolution(false)
    setResultBlob(null)
    setResultUrl('')
  }

  function updateSettings(patch: Partial<GeneratorSettings>) {
    setSettings((current) => ({ ...current, ...patch }))
    setIsHighResolution(false)
  }

  function prepareCanvases(width: number, height: number) {
    if (!texture || !depth) throw new Error('请先上传两张图片')

    const textureCanvas = document.createElement('canvas')
    textureCanvas.width = width
    textureCanvas.height = height
    const textureContext = textureCanvas.getContext('2d', { willReadFrequently: true })!
    drawImageCover(
      textureContext,
      texture.element,
      texture.element.naturalWidth,
      texture.element.naturalHeight,
      width,
      height,
      textureCrop,
    )

    const depthCanvas = document.createElement('canvas')
    depthCanvas.width = width
    depthCanvas.height = height
    const depthContext = depthCanvas.getContext('2d', { willReadFrequently: true })!
    depthContext.fillStyle = '#000'
    depthContext.fillRect(0, 0, width, height)
    depthContext.filter = settings.blur ? `blur(${settings.blur}px)` : 'none'
    drawImageCover(
      depthContext,
      depth.element,
      depth.element.naturalWidth,
      depth.element.naturalHeight,
      width,
      height,
      depthCrop,
    )
    depthContext.filter = 'none'

    const depthImage = depthContext.getImageData(0, 0, width, height)
    const depthValues = new Uint8ClampedArray(width * height)
    const contrastFactor = (259 * (settings.contrast + 255)) / (255 * (259 - settings.contrast))

    for (let pixel = 0; pixel < depthValues.length; pixel += 1) {
      const offset = pixel * 4
      const alpha = depthImage.data[offset + 3] / 255
      let gray = (
        depthImage.data[offset] * 0.299 +
        depthImage.data[offset + 1] * 0.587 +
        depthImage.data[offset + 2] * 0.114
      ) * alpha
      gray = contrastFactor * (gray - 128) + 128 + settings.brightness
      gray = Math.min(255, Math.max(0, gray))
      if (settings.invertDepth) gray = 255 - gray
      depthValues[pixel] = gray
      depthImage.data[offset] = gray
      depthImage.data[offset + 1] = gray
      depthImage.data[offset + 2] = gray
      depthImage.data[offset + 3] = 255
    }
    depthContext.putImageData(depthImage, 0, 0)

    return {
      textureCanvas,
      depthCanvas,
      texturePixels: textureContext.getImageData(0, 0, width, height).data,
      depthValues,
    }
  }

  async function generate(highResolution: boolean) {
    if (!texture || !depth) return null
    setError('')
    setGenerating(true)
    setProgress(0)
    workerRef.current?.terminate()

    const maximumPreviewWidth = 900
    const scale = highResolution ? 1 : Math.min(1, maximumPreviewWidth / settings.width)
    const width = Math.max(320, Math.round(settings.width * scale))
    const height = Math.max(240, Math.round(settings.height * scale))

    try {
      const prepared = prepareCanvases(width, height)
      if (!highResolution) {
        setTexturePreview(prepared.textureCanvas.toDataURL('image/jpeg', 0.86))
        setDepthPreview(prepared.depthCanvas.toDataURL('image/jpeg', 0.86))
      }

      const pixels = await new Promise<Uint8ClampedArray>((resolve, reject) => {
        const worker = new Worker(
          new URL('../workers/stereogram.worker.ts', import.meta.url),
          { type: 'module' },
        )
        workerRef.current = worker
        worker.onmessage = (event) => {
          if (event.data.type === 'progress') setProgress(event.data.progress)
          if (event.data.type === 'complete') resolve(event.data.pixels)
          if (event.data.type === 'error') reject(new Error(event.data.message))
        }
        worker.onerror = () => reject(new Error('立体画计算线程异常'))
        worker.postMessage({
          texture: prepared.texturePixels,
          depthMap: prepared.depthValues,
          width,
          height,
          patternWidth: Math.max(42, Math.round(settings.patternWidth * scale)),
          depthStrength: settings.depthStrength,
        }, [prepared.texturePixels.buffer, prepared.depthValues.buffer])
      })

      const outputCanvas = document.createElement('canvas')
      outputCanvas.width = width
      outputCanvas.height = height
      const outputContext = outputCanvas.getContext('2d')!
      outputContext.putImageData(new ImageData(pixels, width, height), 0, 0)

      if (settings.guideDots) {
        const gap = Math.max(42, Math.round(settings.patternWidth * scale))
        const center = width / 2
        const radius = Math.max(3, Math.round(width / 320))
        outputContext.fillStyle = 'rgba(235,255,76,.92)'
        outputContext.beginPath()
        outputContext.arc(center - gap / 2, Math.max(14, height * 0.035), radius, 0, Math.PI * 2)
        outputContext.arc(center + gap / 2, Math.max(14, height * 0.035), radius, 0, Math.PI * 2)
        outputContext.fill()
      }

      const blob = await canvasToBlob(outputCanvas)
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
      const url = URL.createObjectURL(blob)
      resultUrlRef.current = url
      setResultUrl(url)
      setResultBlob(blob)
      setIsHighResolution(highResolution)
      setPreviewTab('result')
      return blob
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : '生成失败')
      return null
    } finally {
      workerRef.current?.terminate()
      workerRef.current = null
      setGenerating(false)
      setProgress(0)
    }
  }

  async function download(format: 'png' | 'jpeg') {
    let blob = resultBlob
    if (!blob || !isHighResolution) blob = await generate(true)
    if (!blob) return
    if (format === 'jpeg') {
      const image = new Image()
      image.src = URL.createObjectURL(blob)
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = settings.width
      canvas.height = settings.height
      canvas.getContext('2d')!.drawImage(image, 0, 0)
      blob = await canvasToBlob(canvas, 'image/jpeg', 0.92)
      URL.revokeObjectURL(image.src)
    }
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${title.trim() || 'depthloom'}-${settings.width}x${settings.height}.${format === 'jpeg' ? 'jpg' : 'png'}`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }

  async function submitPublish(event: React.FormEvent) {
    event.preventDefault()
    if (!publicConsent) return
    setPublishing(true)
    setError('')
    try {
      let blob = resultBlob
      if (!blob || !isHighResolution) blob = await generate(true)
      if (!blob) throw new Error('请先生成作品')
      const thumbnail = await createThumbnail(blob)
      const form = new FormData()
      form.append('image', blob, 'stereogram.png')
      form.append('thumbnail', thumbnail, 'thumbnail.jpg')
      form.append('title', title)
      form.append('author', author)
      form.append('description', description)
      form.append('category', category)
      form.append('tags', tags)
      form.append('width', String(settings.width))
      form.append('height', String(settings.height))
      form.append('allowDownload', String(allowDownload))
      form.append('source', 'Depthloom 在线制作器')
      form.append('consent', 'true')
      form.append('consentVersion', '2026-06-14')
      const response = await publishWork(form)
      setPublished(response)
      setPublishOpen(false)
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : '发布失败')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="create-page">
      <header className="create-header">
        <div>
          <span className="kicker">OPTICAL WORKBENCH / 01</span>
          <h1>立体画制作台</h1>
        </div>
        <div className="create-intro">
          <p>生成过程默认留在本地。上传任意尺寸图片，我们会按输出比例裁剪，不会拉伸。</p>
          <button onClick={loadExample}>没有素材？加载示例</button>
        </div>
      </header>

      <div className="creator-layout">
        <div className="creator-inputs">
          <CropEditor
            eyebrow="SOURCE A · TEXTURE"
            title="背景纹理"
            image={texture?.element ?? null}
            crop={textureCrop}
            aspectRatio={aspectRatio}
            hint="建议使用细节丰富、没有大面积纯色的图片"
            onFile={(file) => loadFile(file, (loaded) => {
              if (texture) URL.revokeObjectURL(texture.url)
              setTexture(loaded)
              setTextureCrop(DEFAULT_CROP)
              setIsHighResolution(false)
            })}
            onCrop={(crop) => { setTextureCrop(crop); setIsHighResolution(false) }}
          />
          <CropEditor
            eyebrow="SOURCE B · DEPTH"
            title="立体主体"
            image={depth?.element ?? null}
            crop={depthCrop}
            aspectRatio={aspectRatio}
            hint="透明 PNG 效果最佳；亮部靠前，暗部靠后"
            onFile={(file) => loadFile(file, (loaded) => {
              if (depth) URL.revokeObjectURL(depth.url)
              setDepth(loaded)
              setDepthCrop(DEFAULT_CROP)
              setIsHighResolution(false)
            })}
            onCrop={(crop) => { setDepthCrop(crop); setIsHighResolution(false) }}
          />
        </div>

        <aside className="settings-panel">
          <div className="panel-heading">
            <div><span>OUTPUT / PARAMETERS</span><h3>输出与视差</h3></div>
            <button className="text-button" onClick={() => setSettings(DEFAULT_SETTINGS)}>恢复默认</button>
          </div>

          <fieldset>
            <legend>画布尺寸</legend>
            <div className="size-presets">
              {SIZE_PRESETS.map(([width, height]) => (
                <button
                  key={`${width}x${height}`}
                  className={settings.width === width && settings.height === height ? 'active' : ''}
                  onClick={() => updateSettings({ width, height })}
                >
                  {width}<small>×</small>{height}
                </button>
              ))}
            </div>
            <div className="custom-size">
              <label>宽 <input type="number" min="320" max="4096" value={settings.width} onChange={(event) => updateSettings({ width: Math.min(4096, Math.max(320, Number(event.target.value))) })} /></label>
              <span>×</span>
              <label>高 <input type="number" min="240" max="4096" value={settings.height} onChange={(event) => updateSettings({ height: Math.min(4096, Math.max(240, Number(event.target.value))) })} /></label>
            </div>
          </fieldset>

          <fieldset>
            <legend>立体参数</legend>
            <RangeControl label="纹理重复宽度" value={settings.patternWidth} min={48} max={180} suffix="px" onChange={(patternWidth) => updateSettings({ patternWidth })} />
            <RangeControl label="立体深度" value={settings.depthStrength} min={0.2} max={1.4} step={0.01} onChange={(depthStrength) => updateSettings({ depthStrength })} />
            <RangeControl label="深度亮度" value={settings.brightness} min={-100} max={100} onChange={(brightness) => updateSettings({ brightness })} />
            <RangeControl label="深度对比度" value={settings.contrast} min={-100} max={100} onChange={(contrast) => updateSettings({ contrast })} />
            <RangeControl label="边缘柔化" value={settings.blur} min={0} max={8} suffix="px" onChange={(blur) => updateSettings({ blur })} />
          </fieldset>

          <div className="switch-list">
            <label><span><b>反转深度</b><small>切换凸起与凹陷方向</small></span><input type="checkbox" checked={settings.invertDepth} onChange={(event) => updateSettings({ invertDepth: event.target.checked })} /></label>
            <label><span><b>辅助观看点</b><small>在成品顶部加入两个焦点</small></span><input type="checkbox" checked={settings.guideDots} onChange={(event) => updateSettings({ guideDots: event.target.checked })} /></label>
          </div>
        </aside>

        <section className="preview-panel">
          <div className="preview-topbar">
            <div className="preview-tabs">
              <button className={previewTab === 'result' ? 'active' : ''} onClick={() => setPreviewTab('result')}>最终效果</button>
              <button className={previewTab === 'depth' ? 'active' : ''} onClick={() => setPreviewTab('depth')}>深度图</button>
              <button className={previewTab === 'texture' ? 'active' : ''} onClick={() => setPreviewTab('texture')}>纹理图</button>
            </div>
            <span>{isHighResolution ? '高清' : '预览'} · {settings.width} × {settings.height}</span>
          </div>

          <div className="preview-stage">
            {generating ? (
              <div className="generation-progress">
                <div className="progress-orbit"><span style={{ '--progress': `${progress * 360}deg` } as React.CSSProperties} /></div>
                <h3>正在重组水平视差</h3>
                <p>{Math.round(progress * 100)}% · {settings.width} × {settings.height}</p>
                <button onClick={() => { workerRef.current?.terminate(); setGenerating(false) }}>取消</button>
              </div>
            ) : previewTab === 'result' && resultUrl ? (
              <img src={resultUrl} alt="生成的裸眼立体画预览" />
            ) : previewTab === 'depth' && depthPreview ? (
              <img src={depthPreview} alt="深度图预览" />
            ) : previewTab === 'texture' && texturePreview ? (
              <img src={texturePreview} alt="纹理图预览" />
            ) : (
              <div className="preview-empty">
                <div className="scan-window"><i /><i /><i /><i /></div>
                <h3>等待两张输入图片</h3>
                <p>上传背景纹理与立体主体，然后生成快速预览。</p>
              </div>
            )}
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="generation-actions">
            <button className="secondary-button" disabled={!canGenerate} onClick={() => generate(false)}>
              生成快速预览
            </button>
            <button className="primary-button" disabled={!canGenerate} onClick={() => generate(true)}>
              生成高清图片 <span>→</span>
            </button>
          </div>

          <div className="download-row">
            <div><b>本地导出</b><small>下载不要求你公开作品</small></div>
            <button disabled={!resultBlob || generating} onClick={() => download('png')}>下载 PNG</button>
            <button disabled={!resultBlob || generating} onClick={() => download('jpeg')}>下载 JPG</button>
          </div>

          <div className={`consent-card ${publicConsent ? 'selected' : ''}`}>
            <label>
              <input type="checkbox" checked={publicConsent} onChange={(event) => setPublicConsent(event.target.checked)} />
              <span>
                <b>同意将本次生成的作品公开展示在作品画廊中</b>
                <small>勾选后，只有最终作品、作品名称和作者昵称会上传。原始背景图、主体图和深度图不会上传。</small>
              </span>
            </label>
            <p>你可以取消勾选，仅在本地生成和下载。公开发布与下载互不影响。</p>
            {publicConsent && (
              <button className="publish-button" disabled={!resultBlob} onClick={() => setPublishOpen(true)}>
                发布到作品画廊 ↗
              </button>
            )}
          </div>

          {published && (
            <div className="publish-success">
              <span>已发布</span>
              <div><h3>{published.work.title}</h3><p>请保存管理链接，它可用于删除这件作品。</p></div>
              <Link to={`/works/${published.work.id}`}>查看作品</Link>
              <Link to={`/manage/${published.work.id}/${published.manageToken}`}>管理链接</Link>
            </div>
          )}
        </section>
      </div>

      {publishOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setPublishOpen(false)
        }}>
          <form className="publish-modal" onSubmit={submitPublish}>
            <div className="modal-heading">
              <div><span>PUBLICATION CHECK</span><h2>确认公开作品</h2></div>
              <button type="button" onClick={() => setPublishOpen(false)}>×</button>
            </div>
            <p className="modal-note">你正在公开最终成品。原始素材不会上传。</p>
            <label>作品名称 *<input required maxLength={60} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="给这件作品起个名字" /></label>
            <div className="form-row">
              <label>作者昵称<input maxLength={30} value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="匿名创作者" /></label>
              <label>分类<select value={category} onChange={(event) => setCategory(event.target.value)}><option>抽象</option><option>人物</option><option>动物</option><option>建筑</option><option>文字</option><option>实验作品</option></select></label>
            </div>
            <label>作品简介<textarea maxLength={300} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="描述藏在纹理中的内容…" /></label>
            <label>标签<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="球体, 几何, 蓝色（逗号分隔，最多 5 个）" /></label>
            <label className="inline-check"><input type="checkbox" checked={allowDownload} onChange={(event) => setAllowDownload(event.target.checked)} />允许其他用户下载高清作品</label>
            <div className="publication-summary">
              <span>公开内容</span>
              <b>{title || '未命名作品'}</b>
              <small>{settings.width} × {settings.height} · PNG · {author || '匿名创作者'}</small>
            </div>
            <button className="primary-button full-button" disabled={publishing}>
              {publishing ? '正在发布…' : '确认并发布到画廊 →'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
