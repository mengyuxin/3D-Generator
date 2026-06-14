/// <reference lib="webworker" />

import { generateStereogramPixels } from '../lib/stereogram'

self.onmessage = (
  event: MessageEvent<{
    texture: Uint8ClampedArray
    depthMap: Uint8ClampedArray
    width: number
    height: number
    patternWidth: number
    depthStrength: number
  }>,
) => {
  try {
    const { texture, depthMap, ...options } = event.data
    const pixels = generateStereogramPixels(
      texture,
      depthMap,
      options,
      (progress) => self.postMessage({ type: 'progress', progress }),
    )
    self.postMessage({ type: 'complete', pixels }, [pixels.buffer])
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : '生成失败',
    })
  }
}

export {}
