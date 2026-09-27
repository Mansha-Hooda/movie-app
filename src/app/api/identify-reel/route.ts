import { NextResponse } from 'next/server'
import { identifyFromText } from '@/lib/identify'
import type { IdentifyResult } from '@/lib/identify/types'
import { isInstagramReelUrl } from '@/lib/reels/url'
import {
  SupadataError,
  fetchReelMetadata,
  fetchReelTranscript,
  fetchReelVisualAnalysis,
  isSupadataAccessError,
  isSupadataConfigured,
} from '@/lib/supadata/client'

type IdentifyReelBody = {
  url?: string
}

/** Skip the paid visual pass once caption/transcript already names a title. */
const CONFIDENT_HIT = 0.45

export const maxDuration = 60

function combineReelText(parts: {
  caption?: string | null
  title?: string | null
  transcript?: string | null
  visual?: string | null
}): string {
  const sections: string[] = []
  const caption = parts.caption?.trim()
  const title = parts.title?.trim()
  const transcript = parts.transcript?.trim()
  const visual = parts.visual?.trim()

  if (caption) {
    sections.push(`Caption:\n${caption}`)
  } else if (title) {
    sections.push(`Caption:\n${title}`)
  }
  if (transcript) {
    sections.push(`Transcript:\n${transcript}`)
  }
  if (visual) {
    sections.push(visual)
  }

  return sections.join('\n\n')
}

function hasConfidentHit(results: IdentifyResult[]): boolean {
  return results.some(
    (result) =>
      Boolean(result.name?.trim()) &&
      Boolean(result.media_type) &&
      result.confidence >= CONFIDENT_HIT,
  )
}

/**
 * POST /api/identify-reel
 * JSON body: { url: string } — public Instagram reel/post URL
 */
export async function POST(request: Request) {
  try {
    if (!isSupadataConfigured()) {
      return NextResponse.json(
        {
          error: 'Reel identification is not configured on the server',
          code: 'SUPADATA_NOT_CONFIGURED',
        },
        { status: 503 },
      )
    }

    let body: IdentifyReelBody
    try {
      body = (await request.json()) as IdentifyReelBody
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const url = body.url?.trim()
    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 })
    }

    if (!isInstagramReelUrl(url)) {
      return NextResponse.json(
        {
          error: 'Please share a public Instagram reel or post link',
          code: 'INVALID_URL',
        },
        { status: 400 },
      )
    }

    let caption: string | null = null
    let title: string | null = null
    let transcript: string | null = null
    let metadataFailed = false
    let transcriptFailed = false
    let accessBlocked = false

    const [metadataResult, transcriptResult] = await Promise.allSettled([
      fetchReelMetadata(url),
      fetchReelTranscript(url),
    ])

    if (metadataResult.status === 'fulfilled') {
      caption = metadataResult.value.description ?? null
      title = metadataResult.value.title ?? null
    } else {
      metadataFailed = true
      const err = metadataResult.reason
      if (isSupadataAccessError(err)) {
        accessBlocked = true
      }
      console.warn('[identify-reel] metadata failed:', err)
    }

    if (transcriptResult.status === 'fulfilled') {
      transcript = transcriptResult.value || null
    } else {
      transcriptFailed = true
      const err = transcriptResult.reason
      if (isSupadataAccessError(err)) {
        accessBlocked = true
      }
      if (err instanceof SupadataError && err.code === 'transcript-unavailable') {
        transcriptFailed = false
      }
      console.warn('[identify-reel] transcript failed:', err)
    }

    const textOnly = combineReelText({ caption, title, transcript })
    let results: IdentifyResult[] = []

    if (textOnly) {
      results = await identifyFromText(textOnly)
    }

    const skipVisual = hasConfidentHit(results) || (accessBlocked && !textOnly)

    if (!skipVisual) {
      try {
        const visual = await fetchReelVisualAnalysis(url)
        const combined = combineReelText({ caption, title, transcript, visual })
        if (combined && combined !== textOnly) {
          results = await identifyFromText(combined)
        }
      } catch (error) {
        console.warn('[identify-reel] visual analysis skipped:', error)
      }
    }

    if (results.length === 0 && !textOnly) {
      if (accessBlocked && metadataFailed && transcriptFailed) {
        return NextResponse.json(
          {
            error:
              'This reel is private or Supadata cannot access it. Try a public reel link.',
            code: 'REEL_INACCESSIBLE',
          },
          { status: 422 },
        )
      }

      return NextResponse.json(
        {
          error:
            'No caption, spoken audio, or on-screen title was found on this reel. Add the title manually.',
          code: 'NO_TEXT',
          results: [],
          result: { name: null, media_type: null, confidence: 0 },
        },
        { status: 200 },
      )
    }

    return NextResponse.json({
      results,
      result: results[0] ?? { name: null, media_type: null, confidence: 0 },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Reel identification failed'
    console.error('[identify-reel]', message)

    if (error instanceof SupadataError && isSupadataAccessError(error)) {
      return NextResponse.json(
        {
          error:
            'This reel is private or Supadata cannot access it. Try a public reel link.',
          code: 'REEL_INACCESSIBLE',
        },
        { status: 422 },
      )
    }

    return NextResponse.json({ error: message, code: 'IDENTIFY_FAILED' }, { status: 502 })
  }
}
