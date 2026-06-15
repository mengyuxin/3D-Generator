import type { PublishResult, Work, WorkComment } from '../types'

const API_BASE = '/api'

export async function getWorks(sort = 'latest'): Promise<Work[]> {
  const response = await fetch(`${API_BASE}/works?sort=${encodeURIComponent(sort)}`)
  if (!response.ok) throw new Error('无法读取作品')
  return response.json()
}

export async function getWork(id: string): Promise<Work> {
  const response = await fetch(`${API_BASE}/works/${id}`)
  if (!response.ok) throw new Error('作品不存在')
  return response.json()
}

export async function recordWorkView(id: string): Promise<{ views: number }> {
  const response = await fetch(`${API_BASE}/works/${id}/view`, { method: 'POST' })
  if (!response.ok) throw new Error('无法记录浏览')
  return response.json()
}

export async function publishWork(form: FormData): Promise<PublishResult> {
  const response = await fetch(`${API_BASE}/works`, { method: 'POST', body: form })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || '发布失败')
  }
  return response.json()
}

export async function likeWork(id: string): Promise<{ likes: number }> {
  const response = await fetch(`${API_BASE}/works/${id}/like`, { method: 'POST' })
  if (!response.ok) throw new Error('点赞失败')
  return response.json()
}

export async function addWorkComment(
  id: string,
  input: { author: string; body: string },
): Promise<{ comments: WorkComment[] }> {
  const response = await fetch(`${API_BASE}/works/${id}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || '评论提交失败')
  }
  return response.json()
}

export async function deleteWork(id: string, token: string) {
  const response = await fetch(`${API_BASE}/works/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('管理链接无效或作品已删除')
}
