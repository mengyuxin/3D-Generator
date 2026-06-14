import { useEffect, useRef, useState } from 'react'
import { drawImageCover } from '../lib/crop'
import type { CropState } from '../types'

type Props = {
  title: string
  eyebrow: string
  image: HTMLImageElement | null
  crop: CropState
  aspectRatio: number
  accept?: string
  hint: string
  onFile: (file: File) => void
  onCrop: (crop: CropState) => void
}

export function CropEditor({
  title,
  eyebrow,
  image,
  crop,
  aspectRatio,
  accept = 'image/png,image/jpeg,image/webp',
  hint,
  onFile,
  onCrop,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{ x: number; y: number; cropX: number; cropY: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !image) return
    const width = 640
    const height = Math.max(260, Math.round(width / aspectRatio))
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return
    context.fillStyle = '#151b17'
    context.fillRect(0, 0, width, height)
    drawImageCover(context, image, image.naturalWidth, image.naturalHeight, width, height, crop)
  }, [image, crop, aspectRatio])

  function startDrag(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!image) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY, cropX: crop.x, cropY: crop.y }
    setDragging(true)
  }

  function moveDrag(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current || !image) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const dx = (event.clientX - dragRef.current.x) / bounds.width
    const dy = (event.clientY - dragRef.current.y) / bounds.height
    onCrop({
      ...crop,
      x: Math.min(1, Math.max(0, dragRef.current.cropX - dx)),
      y: Math.min(1, Math.max(0, dragRef.current.cropY - dy)),
    })
  }

  function endDrag() {
    dragRef.current = null
    setDragging(false)
  }

  return (
    <section className="crop-editor">
      <div className="panel-heading">
        <div>
          <span>{eyebrow}</span>
          <h3>{title}</h3>
        </div>
        {image && (
          <button className="text-button" onClick={() => onCrop({ zoom: 1, x: 0.5, y: 0.5 })}>
            重置
          </button>
        )}
      </div>

      <label className={`upload-stage ${image ? 'has-image' : ''}`}>
        {!image ? (
          <span className="upload-empty">
            <b>＋</b>
            <strong>选择或拖入图片</strong>
            <small>{hint}</small>
          </span>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              className={dragging ? 'dragging' : ''}
              onPointerDown={startDrag}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            />
            <span className="replace-label">更换图片</span>
          </>
        )}
        <input
          type="file"
          accept={accept}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onFile(file)
            event.target.value = ''
          }}
        />
      </label>

      {image && (
        <div className="crop-controls">
          <label>
            <span>缩放</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={crop.zoom}
              onChange={(event) => onCrop({ ...crop, zoom: Number(event.target.value) })}
            />
            <output>{crop.zoom.toFixed(2)}×</output>
          </label>
          <p>拖动画面调整裁剪位置 · {image.naturalWidth} × {image.naturalHeight}px</p>
        </div>
      )}
    </section>
  )
}
