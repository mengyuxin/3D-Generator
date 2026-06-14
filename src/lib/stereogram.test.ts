import { describe, expect, it } from 'vitest'
import { generateStereogramPixels, separationForDepth } from './stereogram'

describe('stereogram separation', () => {
  it('uses a smaller separation for nearer, brighter pixels', () => {
    const far = separationForDepth(0, 96, 0.8)
    const near = separationForDepth(255, 96, 0.8)
    expect(near).toBeLessThan(far)
  })

  it('clamps invalid depth values', () => {
    expect(separationForDepth(-20, 96, 1)).toBe(separationForDepth(0, 96, 1))
    expect(separationForDepth(999, 96, 1)).toBe(separationForDepth(255, 96, 1))
  })
})

describe('generateStereogramPixels', () => {
  it('returns opaque pixels at the requested size', () => {
    const width = 24
    const height = 4
    const texture = new Uint8ClampedArray(width * height * 4)
    for (let index = 0; index < texture.length; index += 4) {
      texture[index] = index % 255
      texture[index + 1] = 120
      texture[index + 2] = 60
      texture[index + 3] = 255
    }
    const output = generateStereogramPixels(
      texture,
      new Uint8ClampedArray(width * height).fill(180),
      { width, height, patternWidth: 8, depthStrength: 0.7 },
    )
    expect(output).toHaveLength(texture.length)
    expect(Array.from(output.filter((_, index) => index % 4 === 3))).toEqual(
      Array(width * height).fill(255),
    )
  })
})
