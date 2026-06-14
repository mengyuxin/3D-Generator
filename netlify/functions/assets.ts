import { getStore } from '@netlify/blobs'
import type { Config, Context } from '@netlify/functions'

const assetStore = getStore({ name: 'depthloom-assets', consistency: 'strong' })

export default async (_request: Request, context: Context) => {
  const key = context.params.key
  if (!key || key.includes('/') || key.includes('..')) {
    return new Response('Invalid asset key', { status: 400 })
  }
  const result = await assetStore.getWithMetadata(`asset/${key}`, { type: 'arrayBuffer' })
  if (!result) return new Response('Not found', { status: 404 })

  return new Response(result.data, {
    headers: {
      'Content-Type': String(result.metadata?.contentType ?? 'application/octet-stream'),
      'Cache-Control': 'public, max-age=604800',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export const config: Config = {
  path: '/api/assets/:key',
}
