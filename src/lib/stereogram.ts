export type StereogramOptions = {
  width: number
  height: number
  patternWidth: number
  depthStrength: number
}

function find(parent: Int32Array, value: number): number {
  let root = value
  while (parent[root] !== root) root = parent[root]
  while (parent[value] !== value) {
    const next = parent[value]
    parent[value] = root
    value = next
  }
  return root
}

function union(parent: Int32Array, left: number, right: number) {
  const leftRoot = find(parent, left)
  const rightRoot = find(parent, right)
  if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot
}

export function separationForDepth(
  depth: number,
  patternWidth: number,
  depthStrength: number,
) {
  const normalized = Math.min(255, Math.max(0, depth)) / 255
  const maximumShift = Math.max(1, patternWidth * 0.42 * depthStrength)
  return Math.max(2, Math.round(patternWidth - normalized * maximumShift))
}

export function generateStereogramPixels(
  texture: Uint8ClampedArray,
  depthMap: Uint8ClampedArray,
  options: StereogramOptions,
  onProgress?: (progress: number) => void,
) {
  const { width, height, patternWidth, depthStrength } = options
  if (texture.length !== width * height * 4) {
    throw new Error('Texture dimensions do not match the output dimensions.')
  }
  if (depthMap.length !== width * height) {
    throw new Error('Depth map dimensions do not match the output dimensions.')
  }

  const output = new Uint8ClampedArray(texture.length)
  const parent = new Int32Array(width)

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) parent[x] = x

    for (let x = 0; x < width; x += 1) {
      const depth = depthMap[y * width + x]
      const separation = separationForDepth(depth, patternWidth, depthStrength)
      const left = x - Math.floor(separation / 2)
      const right = left + separation

      if (left < 0 || right >= width) continue

      // Keep nearer pixels from being overwritten by a farther constraint.
      const leftDepth = depthMap[y * width + left]
      const rightDepth = depthMap[y * width + right]
      if (leftDepth > depth + 20 || rightDepth > depth + 20) continue
      union(parent, left, right)
    }

    for (let x = 0; x < width; x += 1) {
      const root = find(parent, x)
      const sourceX = ((root % patternWidth) + patternWidth) % patternWidth
      const sourceOffset = (y * width + sourceX) * 4
      const targetOffset = (y * width + x) * 4
      output[targetOffset] = texture[sourceOffset]
      output[targetOffset + 1] = texture[sourceOffset + 1]
      output[targetOffset + 2] = texture[sourceOffset + 2]
      output[targetOffset + 3] = 255
    }

    if (onProgress && (y % 12 === 0 || y === height - 1)) {
      onProgress((y + 1) / height)
    }
  }

  return output
}
