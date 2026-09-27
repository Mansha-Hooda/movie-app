import { NextResponse } from 'next/server'
import { getWatchProviders } from '@/lib/watchmode/providers'
import type { MediaType } from '@/types/database'

const MEDIA_TYPES: MediaType[] = ['movie', 'show', 'book']

function isMediaType(value: string): value is MediaType {
  return MEDIA_TYPES.includes(value as MediaType)
}

/**
 * GET /api/watch-providers?media_type=movie|show|book&tmdb_id=...
 * or &q=title name when the title row has no stored TMDb id.
 * Empty providers means "hide the section" — not an error.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mediaTypeParam = searchParams.get('media_type') ?? ''
  const tmdbId = searchParams.get('tmdb_id')
  const name = searchParams.get('q') ?? ''

  if (!isMediaType(mediaTypeParam)) {
    return NextResponse.json({ providers: [] })
  }

  const providers = await getWatchProviders({
    name,
    mediaType: mediaTypeParam,
    tmdbId,
  })

  return NextResponse.json({ providers })
}
