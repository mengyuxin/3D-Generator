export type CropState = {
  zoom: number
  x: number
  y: number
}

export type GeneratorSettings = {
  width: number
  height: number
  patternWidth: number
  depthStrength: number
  brightness: number
  contrast: number
  blur: number
  invertDepth: boolean
  guideDots: boolean
}

export type Work = {
  id: string
  title: string
  author: string
  description: string
  category: string
  tags: string[]
  width: number
  height: number
  imageUrl: string
  thumbnailUrl: string
  createdAt: string
  views: number
  likes: number
  allowDownload: boolean
  source?: string
  sourceUrl?: string
}

export type PublishResult = {
  work: Work
  manageToken: string
}
