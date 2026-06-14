import { describe, expect, it } from 'vitest'
import { calculateCoverRect } from './crop'

describe('calculateCoverRect', () => {
  it('fills the canvas without stretching a wide source', () => {
    const rect = calculateCoverRect(2000, 1000, 800, 600, { zoom: 1, x: 0.5, y: 0.5 })
    expect(rect.sw / rect.sh).toBeCloseTo(800 / 600)
    expect(rect.dw).toBe(800)
    expect(rect.dh).toBe(600)
    expect(rect.sx).toBeGreaterThan(0)
  })

  it('moves the crop window using normalized positions', () => {
    const left = calculateCoverRect(2000, 1000, 800, 600, { zoom: 1, x: 0, y: 0.5 })
    const right = calculateCoverRect(2000, 1000, 800, 600, { zoom: 1, x: 1, y: 0.5 })
    expect(left.sx).toBe(0)
    expect(right.sx).toBeGreaterThan(left.sx)
  })
})
