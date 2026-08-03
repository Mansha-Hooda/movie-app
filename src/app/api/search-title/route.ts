import { NextResponse } from 'next/server'
import { enrichTitle, searchTitles } from '@/lib/enrichment/providers'
import type { MediaType } from '@/types/database'

const MEDIA_TYPES: MediaType[] = ['movie', 'show', 'book']

function isMediaType(value: string): value is MediaType {
  return MEDIA_TYPES.includes(value as MediaType)
}

/**
 * GET /api/search-title?q=...&media_type=movie|show|book
 * Optional: &id=... to fetch full enrichment for a selected result.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mediaTypeParam = searchParams.get('media_type') ?? ''
  const id = searchParams.get('id')
  const query = searchParams.get('q') ?? ''

  if (!isMediaType(mediaTypeParam)) {
    return NextResponse.json(
      { error: 'media_type must be movie, show, or book' },
      { status: 400 },
    )
  }

  try {
    if (id) {
      const enrichment = await enrichTitle(id, mediaTypeParam)
      return NextResponse.json({ enrichment })
    }

    if (query.trim().length < 2) {
      return NextResponse.json({ results: [] })
    }

    const results = await searchTitles(query, mediaTypeParam)
    return NextResponse.json({ results })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed'
    console.error('[search-title]', message)
    return NextResponse.json({ error: message, results: [] }, { status: 502 })
  }
}
