import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import cors from 'cors'
import express from 'express'
import multer from 'multer'

type StoredWork = {
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
  manageTokenHash: string
  consentVersion: string
  consentedAt: string
}

const root = process.cwd()
const dataDirectory = path.join(root, 'server', 'data')
const uploadsDirectory = path.join(root, 'server', 'uploads')
const databaseFile = path.join(dataDirectory, 'works.json')
const app = express()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
})
const publishAttempts = new Map<string, number[]>()

app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use('/uploads', express.static(uploadsDirectory, {
  fallthrough: false,
  immutable: true,
  maxAge: '7d',
}))

async function ensureStorage() {
  await fs.mkdir(dataDirectory, { recursive: true })
  await fs.mkdir(uploadsDirectory, { recursive: true })
  try {
    await fs.access(databaseFile)
  } catch {
    await fs.writeFile(databaseFile, '[]', 'utf8')
  }
}

async function readWorks(): Promise<StoredWork[]> {
  await ensureStorage()
  return JSON.parse(await fs.readFile(databaseFile, 'utf8'))
}

async function writeWorks(works: StoredWork[]) {
  await fs.writeFile(databaseFile, JSON.stringify(works, null, 2), 'utf8')
}

function publicWork({ manageTokenHash: _, consentVersion: __, consentedAt: ___, ...work }: StoredWork) {
  return work
}

function cleanText(value: unknown, maximum: number) {
  return String(value ?? '').replace(/[<>]/g, '').trim().slice(0, maximum)
}

function cleanUrl(value: unknown) {
  const candidate = cleanText(value, 300)
  if (!candidate) return ''
  try {
    const url = new URL(candidate)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''
  } catch {
    return ''
  }
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function isSupportedImage(buffer: Buffer) {
  const isPng = buffer.length > 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  const isJpeg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  return isPng || isJpeg
}

function publishRateLimit(request: express.Request, response: express.Response, next: express.NextFunction) {
  const key = request.ip || 'unknown'
  const cutoff = Date.now() - 60 * 60 * 1000
  const recent = (publishAttempts.get(key) ?? []).filter((timestamp) => timestamp > cutoff)
  if (recent.length >= 10) return response.status(429).json({ message: '发布过于频繁，请稍后再试' })
  recent.push(Date.now())
  publishAttempts.set(key, recent)
  next()
}

app.get('/api/works', async (request, response) => {
  const works = await readWorks()
  const sort = String(request.query.sort ?? 'latest')
  works.sort((a, b) => {
    if (sort === 'popular') return b.views + b.likes * 4 - (a.views + a.likes * 4)
    if (sort === 'liked') return b.likes - a.likes
    return b.createdAt.localeCompare(a.createdAt)
  })
  response.json(works.map(publicWork))
})

app.get('/api/works/:id', async (request, response) => {
  const works = await readWorks()
  const work = works.find((entry) => entry.id === request.params.id)
  if (!work) return response.status(404).json({ message: '作品不存在' })
  response.json(publicWork(work))
})

app.post('/api/works/:id/view', async (request, response) => {
  const works = await readWorks()
  const work = works.find((entry) => entry.id === request.params.id)
  if (!work) return response.status(404).json({ message: '作品不存在' })
  work.views += 1
  await writeWorks(works)
  response.json({ views: work.views })
})

app.post('/api/works', publishRateLimit, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]), async (request, response) => {
  const files = request.files as Record<string, Express.Multer.File[]> | undefined
  const image = files?.image?.[0]
  const thumbnail = files?.thumbnail?.[0]
  if (!image || !['image/png', 'image/jpeg'].includes(image.mimetype) || !isSupportedImage(image.buffer)) {
    return response.status(400).json({ message: '只接受 PNG 或 JPG 成品图片' })
  }
  if (!thumbnail || thumbnail.mimetype !== 'image/jpeg' || !isSupportedImage(thumbnail.buffer)) {
    return response.status(400).json({ message: '缩略图格式无效' })
  }
  if (request.body.consent !== 'true') {
    return response.status(400).json({ message: '发布前需要明确同意公开展示' })
  }

  const width = Number(request.body.width)
  const height = Number(request.body.height)
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 320 || height < 240) {
    return response.status(400).json({ message: '输出尺寸无效' })
  }

  const id = crypto.randomUUID()
  const manageToken = crypto.randomBytes(32).toString('hex')
  const extension = image.mimetype === 'image/png' ? 'png' : 'jpg'
  const filename = `${id}.${extension}`
  const thumbnailFilename = `${id}-thumb.jpg`
  await Promise.all([
    fs.writeFile(path.join(uploadsDirectory, filename), image.buffer),
    fs.writeFile(path.join(uploadsDirectory, thumbnailFilename), thumbnail.buffer),
  ])

  const work: StoredWork = {
    id,
    title: cleanText(request.body.title, 60) || '未命名作品',
    author: cleanText(request.body.author, 30) || '匿名创作者',
    description: cleanText(request.body.description, 300),
    category: cleanText(request.body.category, 30) || '实验作品',
    tags: cleanText(request.body.tags, 120).split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 5),
    width,
    height,
    imageUrl: `/uploads/${filename}`,
    thumbnailUrl: `/uploads/${thumbnailFilename}`,
    createdAt: new Date().toISOString(),
    views: 0,
    likes: 0,
    allowDownload: request.body.allowDownload === 'true',
    status: 'public',
    source: cleanText(request.body.source, 40),
    sourceUrl: cleanUrl(request.body.sourceUrl),
    manageTokenHash: hashToken(manageToken),
    consentVersion: cleanText(request.body.consentVersion, 30) || '2026-06-14',
    consentedAt: new Date().toISOString(),
  }

  const works = await readWorks()
  works.push(work)
  await writeWorks(works)
  response.status(201).json({ work: publicWork(work), manageToken })
})

app.post('/api/works/:id/like', async (request, response) => {
  const works = await readWorks()
  const work = works.find((entry) => entry.id === request.params.id)
  if (!work) return response.status(404).json({ message: '作品不存在' })
  work.likes += 1
  await writeWorks(works)
  response.json({ likes: work.likes })
})

app.delete('/api/works/:id', async (request, response) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '') ?? ''
  const works = await readWorks()
  const work = works.find((entry) => entry.id === request.params.id)
  if (!work) return response.status(404).json({ message: '作品不存在' })
  if (!token || hashToken(token) !== work.manageTokenHash) {
    return response.status(403).json({ message: '无权管理此作品' })
  }
  await fs.rm(path.join(uploadsDirectory, path.basename(work.imageUrl)), { force: true })
  await fs.rm(path.join(uploadsDirectory, path.basename(work.thumbnailUrl)), { force: true })
  await writeWorks(works.filter((entry) => entry.id !== work.id))
  response.status(204).end()
})

const distributionDirectory = path.join(root, 'dist')
app.use(express.static(distributionDirectory))
app.use((request, response, next) => {
  if (request.method === 'GET' && !request.path.startsWith('/api') && request.accepts('html')) {
    return response.sendFile(path.join(distributionDirectory, 'index.html'), (error) => {
      if (error) next()
    })
  }
  next()
})

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error)
  response.status(500).json({ message: '服务器暂时无法完成请求' })
})

const port = Number(process.env.PORT || 8787)
ensureStorage().then(() => {
  app.listen(port, () => console.log(`Depthloom API listening on http://localhost:${port}`))
})
