import { getStore } from '@netlify/blobs'
import type { Config, Context } from '@netlify/functions'
import {
  cleanText,
  hashToken,
  isSupportedImage,
  json,
  publicWork,
  type StoredWork,
} from './_shared/works'

const workStore = getStore({ name: 'depthloom-works', consistency: 'strong' })
const assetStore = getStore({ name: 'depthloom-assets', consistency: 'strong' })
const rateStore = getStore({ name: 'depthloom-rate-limits', consistency: 'strong' })

async function readWork(id: string) {
  return workStore.get(`work/${id}`, { type: 'json' }) as Promise<StoredWork | null>
}

async function writeWork(work: StoredWork) {
  await workStore.setJSON(`work/${work.id}`, work)
}

async function checkPublishRate(context: Context) {
  const now = Date.now()
  const bucket = new Date(now).toISOString().slice(0, 13)
  const key = `publish/${await hashToken(`${context.ip}:${bucket}`)}`
  const attempts = Number(await rateStore.get(key) ?? '0')
  if (attempts >= 10) return false
  await rateStore.set(key, String(attempts + 1))
  return true
}

async function listWorks(request: Request) {
  const { blobs } = await workStore.list({ prefix: 'work/' })
  const works = (await Promise.all(
    blobs.map(({ key }) => workStore.get(key, { type: 'json' }) as Promise<StoredWork | null>),
  )).filter((work): work is StoredWork => Boolean(work))
  const sort = new URL(request.url).searchParams.get('sort') ?? 'latest'
  works.sort((a, b) => {
    if (sort === 'popular') return b.views + b.likes * 4 - (a.views + a.likes * 4)
    if (sort === 'liked') return b.likes - a.likes
    return b.createdAt.localeCompare(a.createdAt)
  })
  return json(works.map(publicWork))
}

async function createWork(request: Request, context: Context) {
  if (!(await checkPublishRate(context))) {
    return json({ message: '发布过于频繁，请稍后再试' }, 429)
  }

  const form = await request.formData()
  const image = form.get('image')
  const thumbnail = form.get('thumbnail')
  if (!(image instanceof File) || !(thumbnail instanceof File)) {
    return json({ message: '缺少作品图片或缩略图' }, 400)
  }
  if (image.size > 4.5 * 1024 * 1024 || thumbnail.size > 1 * 1024 * 1024) {
    return json({ message: '公开作品文件过大，请降低输出尺寸后重试' }, 413)
  }

  const imageBytes = new Uint8Array(await image.arrayBuffer())
  const thumbnailBytes = new Uint8Array(await thumbnail.arrayBuffer())
  if (!['image/png', 'image/jpeg'].includes(image.type) || !isSupportedImage(imageBytes)) {
    return json({ message: '只接受 PNG 或 JPG 成品图片' }, 400)
  }
  if (thumbnail.type !== 'image/jpeg' || !isSupportedImage(thumbnailBytes)) {
    return json({ message: '缩略图格式无效' }, 400)
  }
  if (form.get('consent') !== 'true') {
    return json({ message: '发布前需要明确同意公开展示' }, 400)
  }

  const width = Number(form.get('width'))
  const height = Number(form.get('height'))
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 320 || height < 240) {
    return json({ message: '输出尺寸无效' }, 400)
  }

  const id = crypto.randomUUID()
  const manageTokenBytes = crypto.getRandomValues(new Uint8Array(32))
  const manageToken = Array.from(manageTokenBytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
  const extension = image.type === 'image/png' ? 'png' : 'jpg'
  const imageKey = `${id}.${extension}`
  const thumbnailKey = `${id}-thumb.jpg`

  await Promise.all([
    assetStore.set(`asset/${imageKey}`, imageBytes, {
      metadata: { contentType: image.type },
    }),
    assetStore.set(`asset/${thumbnailKey}`, thumbnailBytes, {
      metadata: { contentType: 'image/jpeg' },
    }),
  ])

  const work: StoredWork = {
    id,
    title: cleanText(form.get('title'), 60) || '未命名作品',
    author: cleanText(form.get('author'), 30) || '匿名创作者',
    description: cleanText(form.get('description'), 300),
    category: cleanText(form.get('category'), 30) || '实验作品',
    tags: cleanText(form.get('tags'), 120)
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 5),
    width,
    height,
    imageUrl: `/api/assets/${imageKey}`,
    thumbnailUrl: `/api/assets/${thumbnailKey}`,
    createdAt: new Date().toISOString(),
    views: 0,
    likes: 0,
    allowDownload: form.get('allowDownload') === 'true',
    status: 'public',
    manageTokenHash: await hashToken(manageToken),
    consentVersion: cleanText(form.get('consentVersion'), 30) || '2026-06-14',
    consentedAt: new Date().toISOString(),
  }
  await writeWork(work)
  return json({ work: publicWork(work), manageToken }, 201)
}

async function updateWorkAction(id: string, action: string) {
  const work = await readWork(id)
  if (!work) return json({ message: '作品不存在' }, 404)
  if (action === 'view') work.views += 1
  else if (action === 'like') work.likes += 1
  else return json({ message: '未知操作' }, 404)
  await writeWork(work)
  return json(action === 'view' ? { views: work.views } : { likes: work.likes })
}

async function deleteWork(request: Request, id: string) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const work = await readWork(id)
  if (!work) return json({ message: '作品不存在' }, 404)
  if (!token || await hashToken(token) !== work.manageTokenHash) {
    return json({ message: '无权管理此作品' }, 403)
  }
  await Promise.all([
    workStore.delete(`work/${id}`),
    assetStore.delete(`asset/${work.imageUrl.split('/').pop()}`),
    assetStore.delete(`asset/${work.thumbnailUrl.split('/').pop()}`),
  ])
  return new Response(null, { status: 204 })
}

export default async (request: Request, context: Context) => {
  const id = context.params.id
  const action = context.params.action

  try {
    if (!id && request.method === 'GET') return listWorks(request)
    if (!id && request.method === 'POST') return createWork(request, context)
    if (id && action && request.method === 'POST') return updateWorkAction(id, action)
    if (id && !action && request.method === 'GET') {
      const work = await readWork(id)
      return work ? json(publicWork(work)) : json({ message: '作品不存在' }, 404)
    }
    if (id && !action && request.method === 'DELETE') return deleteWork(request, id)
    return json({ message: 'Method not allowed' }, 405)
  } catch (error) {
    console.error(error)
    return json({ message: '服务器暂时无法完成请求' }, 500)
  }
}

export const config: Config = {
  path: ['/api/works', '/api/works/:id', '/api/works/:id/:action'],
}
