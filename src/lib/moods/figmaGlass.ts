/** Figma Glass effect values from the design panel. */
export const FIGMA_GLASS = {
  lightAngleDeg: -45,
  lightIntensity: 0.8,
  refraction: 90,
  depth: 90,
  dispersion: 100,
  frost: 29,
  splay: 100,
} as const

export type GlassMaps = {
  displacement: string
  specular: string
  width: number
  height: number
}

function roundedBoxSdf(
  x: number,
  y: number,
  halfW: number,
  halfH: number,
  radius: number,
) {
  const qx = Math.abs(x) - halfW + radius
  const qy = Math.abs(y) - halfH + radius
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
  const inside = Math.min(Math.max(qx, qy), 0)
  return outside + inside - radius
}

function toDataUrl(canvas: HTMLCanvasElement) {
  return canvas.toDataURL('image/png')
}

export function createGlassMaps(
  width: number,
  height: number,
  radius: number,
): GlassMaps | null {
  if (width < 8 || height < 8) return null

  const w = Math.round(width)
  const h = Math.round(height)
  const disp = document.createElement('canvas')
  const spec = document.createElement('canvas')
  disp.width = spec.width = w
  disp.height = spec.height = h
  const dispCtx = disp.getContext('2d')
  const specCtx = spec.getContext('2d')
  if (!dispCtx || !specCtx) return null

  const dispImage = dispCtx.createImageData(w, h)
  const specImage = specCtx.createImageData(w, h)
  const dd = dispImage.data
  const sd = specImage.data

  const halfW = w / 2
  const halfH = h / 2
  const r = Math.min(radius, halfW - 1, halfH - 1)
  const maxBezel = Math.min(w, h) / 2 - 1
  const depthPx = Math.max(4, (FIGMA_GLASS.depth / 100) * maxBezel)
  const splay = FIGMA_GLASS.splay / 100
  const refraction = FIGMA_GLASS.refraction / 100
  const highlightDepth = depthPx * (1.4 + splay * 1.6)
  const angle = (FIGMA_GLASS.lightAngleDeg * Math.PI) / 180
  const lx = Math.cos(angle)
  const ly = Math.sin(angle)
  const eps = 1

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4
      const px = x + 0.5 - halfW
      const py = y + 0.5 - halfH
      const sdf = roundedBoxSdf(px, py, halfW, halfH, r)
      const inside = sdf < 0
      const fromEdge = inside ? -sdf : 0

      dd[i] = 128
      dd[i + 1] = 128
      dd[i + 2] = 128
      dd[i + 3] = inside ? 255 : 0
      sd[i] = 255
      sd[i + 1] = 255
      sd[i + 2] = 255
      sd[i + 3] = 0

      if (!inside) continue

      const nx =
        roundedBoxSdf(px + eps, py, halfW, halfH, r) -
        roundedBoxSdf(px - eps, py, halfW, halfH, r)
      const ny =
        roundedBoxSdf(px, py + eps, halfW, halfH, r) -
        roundedBoxSdf(px, py - eps, halfW, halfH, r)
      const nLen = Math.hypot(nx, ny) || 1
      const nnx = nx / nLen
      const nny = ny / nLen

      const depthT = Math.min(1, fromEdge / depthPx)
      const spread = Math.pow(1 - depthT, 1 - splay * 0.45)
      const bevel = Math.sin(Math.min(1, fromEdge / depthPx) * Math.PI) * spread
      const mag = bevel * refraction * 127
      dd[i] = Math.max(0, Math.min(255, 128 + nnx * mag))
      dd[i + 1] = Math.max(0, Math.min(255, 128 + nny * mag))

      const dot = Math.abs(nnx * lx + nny * ly)
      const highlightT = Math.min(1, fromEdge / highlightDepth)
      const edge = Math.sqrt(Math.max(0, 1 - (1 - highlightT) ** 2))
      sd[i + 3] = Math.min(
        255,
        (255 * Math.pow(dot * edge, 1.35) * FIGMA_GLASS.lightIntensity * (0.55 + splay * 0.45)) | 0,
      )
    }
  }

  dispCtx.putImageData(dispImage, 0, 0)
  specCtx.putImageData(specImage, 0, 0)
  return {
    displacement: toDataUrl(disp),
    specular: toDataUrl(spec),
    width: w,
    height: h,
  }
}
