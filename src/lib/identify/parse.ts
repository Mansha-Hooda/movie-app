import type { IdentifyResult } from '@/lib/identify/types'

export function parseIdentifyJson(text: string): IdentifyResult {
  const trimmed = text.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  const raw = jsonMatch ? jsonMatch[0] : trimmed
  const parsed = JSON.parse(raw) as {
    name?: unknown
    media_type?: unknown
    confidence?: unknown
  }

  const mediaType =
    parsed.media_type === 'movie' ||
    parsed.media_type === 'show' ||
    parsed.media_type === 'book'
      ? parsed.media_type
      : null

  const name =
    typeof parsed.name === 'string' && parsed.name.trim()
      ? parsed.name.trim()
      : null

  let confidence = 0
  if (typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)) {
    confidence = Math.max(0, Math.min(1, parsed.confidence))
  }

  return { name, media_type: mediaType, confidence }
}

export function emptyIdentifyResult(): IdentifyResult {
  return { name: null, media_type: null, confidence: 0 }
}
