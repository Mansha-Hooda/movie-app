import { normalizeTitleName } from '@/lib/titles/api'
import type { IdentifyResult } from '@/lib/identify/types'

function parseOne(value: unknown): IdentifyResult | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const parsed = value as {
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

  if (!name && !mediaType) return null
  return { name, media_type: mediaType, confidence }
}

function extractJsonValue(text: string): unknown {
  const trimmed = text.trim()
  const objectStart = trimmed.indexOf('{')
  const arrayStart = trimmed.indexOf('[')

  const start =
    objectStart === -1
      ? arrayStart
      : arrayStart === -1
        ? objectStart
        : Math.min(objectStart, arrayStart)

  if (start < 0) {
    return JSON.parse(trimmed)
  }

  return JSON.parse(trimmed.slice(start))
}

function collectResults(parsed: unknown): IdentifyResult[] {
  if (Array.isArray(parsed)) {
    return parsed.map(parseOne).filter((item): item is IdentifyResult => Boolean(item))
  }

  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>
    const nested = record.titles ?? record.results ?? record.items
    if (Array.isArray(nested)) {
      return nested.map(parseOne).filter((item): item is IdentifyResult => Boolean(item))
    }
    const single = parseOne(parsed)
    return single ? [single] : []
  }

  return []
}

function dedupeResults(results: IdentifyResult[]): IdentifyResult[] {
  const best = new Map<string, IdentifyResult>()

  for (const result of results) {
    if (!result.name || !result.media_type) continue
    const key = `${result.media_type}:${normalizeTitleName(result.name)}`
    const existing = best.get(key)
    if (!existing || result.confidence > existing.confidence) {
      best.set(key, result)
    }
  }

  const named = [...best.values()]
  const unnamed = results.filter((result) => !result.name || !result.media_type)
  return named.length > 0 ? named : unnamed
}

export function parseIdentifyJson(text: string): IdentifyResult[] {
  const parsed = extractJsonValue(text)
  return dedupeResults(collectResults(parsed))
}

export function emptyIdentifyResults(): IdentifyResult[] {
  return []
}

/** @deprecated Use emptyIdentifyResults — kept for older call sites. */
export function emptyIdentifyResult(): IdentifyResult {
  return { name: null, media_type: null, confidence: 0 }
}
