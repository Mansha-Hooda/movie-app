const DEFAULT_MAX_DIMENSION = 1600
const DEFAULT_QUALITY = 0.8

/**
 * Resize + JPEG-compress an image for API upload (keeps payloads under
 * Vercel's ~4.5MB body limit while preserving readable screenshot text).
 */
export async function compressImageForUpload(
  file: File,
  options?: { maxDimension?: number; quality?: number },
): Promise<File> {
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION
  const quality = options?.quality ?? DEFAULT_QUALITY

  // Already small JPEGs can skip work, but still normalize via canvas when large.
  if (file.size < 500_000 && file.type === 'image/jpeg') {
    // Still resize if dimensions are huge — fall through to canvas path.
  }

  const bitmap = await loadImageBitmap(file)
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxDimension)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Canvas not available')
    }

    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await canvasToJpegBlob(canvas, quality)
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'screenshot'
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
  } finally {
    bitmap.close()
  }
}

function fitWithin(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxDimension) {
    return { width, height }
  }

  const scale = maxDimension / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file)
  } catch {
    // Fallback for environments where createImageBitmap rejects the type
    const objectUrl = URL.createObjectURL(file)
    try {
      const image = await loadHtmlImage(objectUrl)
      return await createImageBitmap(image)
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to decode image'))
    image.src = src
  })
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to compress image'))
      },
      'image/jpeg',
      quality,
    )
  })
}
