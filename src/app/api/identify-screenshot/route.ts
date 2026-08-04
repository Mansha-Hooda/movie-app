import { NextResponse } from 'next/server'
import { identifyScreenshot } from '@/lib/gemini/identify'

/** Keep under Vercel's ~4.5MB request body limit (leave headroom for multipart overhead). */
const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
])

/**
 * POST /api/identify-screenshot
 * multipart field "image" (or JSON { imageBase64, mimeType })
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let mimeType = 'image/jpeg'
    let imageBase64 = ''

    if (contentType.includes('multipart/form-data')) {
      let formData: FormData
      try {
        formData = await request.formData()
      } catch {
        return NextResponse.json(
          {
            error: 'Image too large, please try again',
            code: 'IMAGE_TOO_LARGE',
          },
          { status: 413 },
        )
      }

      const file = formData.get('image')

      if (!(file instanceof Blob) || file.size === 0) {
        return NextResponse.json({ error: 'Missing image file' }, { status: 400 })
      }

      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          {
            error: 'Image too large, please try again',
            code: 'IMAGE_TOO_LARGE',
          },
          { status: 413 },
        )
      }

      mimeType = file.type || 'image/jpeg'
      if (!ALLOWED_TYPES.has(mimeType)) {
        return NextResponse.json(
          { error: `Unsupported image type: ${mimeType}` },
          { status: 400 },
        )
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      imageBase64 = buffer.toString('base64')
    } else {
      let body: { imageBase64?: string; mimeType?: string }
      try {
        body = (await request.json()) as {
          imageBase64?: string
          mimeType?: string
        }
      } catch {
        return NextResponse.json(
          {
            error: 'Image too large, please try again',
            code: 'IMAGE_TOO_LARGE',
          },
          { status: 413 },
        )
      }

      if (!body.imageBase64) {
        return NextResponse.json({ error: 'Missing imageBase64' }, { status: 400 })
      }

      mimeType = body.mimeType || 'image/jpeg'
      imageBase64 = body.imageBase64.replace(/^data:[^;]+;base64,/, '')

      const approxBytes = (imageBase64.length * 3) / 4
      if (approxBytes > MAX_BYTES) {
        return NextResponse.json(
          {
            error: 'Image too large, please try again',
            code: 'IMAGE_TOO_LARGE',
          },
          { status: 413 },
        )
      }
    }

    const result = await identifyScreenshot(imageBase64, mimeType)
    return NextResponse.json({ result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Identification failed'
    console.error('[identify-screenshot]', message)

    if (/too large|payload|entity too large|body.*limit/i.test(message)) {
      return NextResponse.json(
        {
          error: 'Image too large, please try again',
          code: 'IMAGE_TOO_LARGE',
        },
        { status: 413 },
      )
    }

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
