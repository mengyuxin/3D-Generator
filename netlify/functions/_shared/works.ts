export type StoredWork = {
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
  status: 'public'
  source?: string
  sourceUrl?: string
  comments?: WorkComment[]
  manageTokenHash: string
  consentVersion: string
  consentedAt: string
}

export type WorkComment = {
  id: string
  author: string
  body: string
  createdAt: string
}

export function publicWork({
  manageTokenHash: _,
  consentVersion: __,
  consentedAt: ___,
  ...work
}: StoredWork) {
  return {
    ...work,
    comments: work.comments ?? [],
  }
}

export function cleanText(value: unknown, maximum: number) {
  return String(value ?? '').replace(/[<>]/g, '').trim().slice(0, maximum)
}

export function cleanUrl(value: unknown) {
  const candidate = cleanText(value, 300)
  if (!candidate) return ''
  try {
    const url = new URL(candidate)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''
  } catch {
    return ''
  }
}

export async function hashToken(token: string) {
  const bytes = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function isSupportedImage(bytes: Uint8Array) {
  const isPng = bytes.length > 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)
  const isJpeg = bytes.length > 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  return isPng || isJpeg
}

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
