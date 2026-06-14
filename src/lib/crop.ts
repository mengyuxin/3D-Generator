import type { CropState } from '../types'

export type DrawRect = {
  sx: number
  sy: number
  sw: number
  sh: number
  dx: number
  dy: number
  dw: number
  dh: number
}

export function calculateCoverRect(
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  crop: CropState,
): DrawRect {
  const baseScale = Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight)
  const scale = baseScale * Math.max(1, crop.zoom)
  const sourceWidth = canvasWidth / scale
  const sourceHeight = canvasHeight / scale
  const maxX = Math.max(0, imageWidth - sourceWidth)
  const maxY = Math.max(0, imageHeight - sourceHeight)
  const normalizedX = Math.min(1, Math.max(0, crop.x))
  const normalizedY = Math.min(1, Math.max(0, crop.y))

  return {
    sx: maxX * normalizedX,
    sy: maxY * normalizedY,
    sw: sourceWidth,
    sh: sourceHeight,
    dx: 0,
    dy: 0,
    dw: canvasWidth,
    dh: canvasHeight,
  }
}

export function drawImageCover(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  crop: CropState,
) {
  const rect = calculateCoverRect(
    imageWidth,
    imageHeight,
    canvasWidth,
    canvasHeight,
    crop,
  )
  context.drawImage(
    image,
    rect.sx,
    rect.sy,
    rect.sw,
    rect.sh,
    rect.dx,
    rect.dy,
    rect.dw,
    rect.dh,
  )
}
