import { NextResponse } from 'next/server'
import { enrichForInsert, mapWithConcurrency } from '@/lib/enrichment/batch'
import { createClient } from '@/lib/supabase/server'
import {
  createTitles,
  findDuplicateInList,
  normalizeTitleName,
} from '@/lib/titles/api'
import type { MediaType } from '@/types/database'

const MEDIA_TYPES: MediaType[] = ['movie', 'show', 'book']
const MAX_TITLES = 25
const ENRICH_CONCURRENCY = 4

type BatchTitleInput = {
  name?: string
  media_type?: string
}

function isMediaType(value: string): value is MediaType {
  return MEDIA_TYPES.includes(value as MediaType)
}

/**
 * POST /api/batch-add-titles
 * JSON body: { titles: [{ name, media_type }] }
 * Enriches in parallel, then inserts in one write.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to add titles' }, { status: 401 })
  }

  let body: { titles?: BatchTitleInput[] }
  try {
    body = (await request.json()) as { titles?: BatchTitleInput[] }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const incoming = (body.titles ?? [])
    .map((item) => ({
      name: item.name?.trim() ?? '',
      media_type: item.media_type ?? '',
    }))
    .filter((item) => item.name && isMediaType(item.media_type))
    .map((item) => ({
      name: item.name,
      media_type: item.media_type as MediaType,
    }))

  if (incoming.length === 0) {
    return NextResponse.json({ error: 'No titles to add' }, { status: 400 })
  }

  if (incoming.length > MAX_TITLES) {
    return NextResponse.json(
      { error: `You can add at most ${MAX_TITLES} titles at once` },
      { status: 400 },
    )
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('titles')
    .select('*')
    .eq('user_id', user.id)

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }

  const existing = existingRows ?? []
  const unique: { name: string; media_type: MediaType }[] = []
  const seen = new Set<string>()
  let skippedDuplicates = 0

  for (const item of incoming) {
    const key = `${item.media_type}:${normalizeTitleName(item.name)}`
    if (seen.has(key) || findDuplicateInList(existing, item.name, item.media_type)) {
      skippedDuplicates += 1
      continue
    }
    seen.add(key)
    unique.push(item)
  }

  if (unique.length === 0) {
    return NextResponse.json({ added: 0, skipped: skippedDuplicates })
  }

  const enriched = await mapWithConcurrency(unique, ENRICH_CONCURRENCY, async (item) => {
    const details = await enrichForInsert(item.name, item.media_type)
    return {
      name: details.name || item.name,
      media_type: item.media_type,
      suggested_by: '',
      mood_tags: details.mood_tags,
      time_commitment: 'soon' as const,
      poster_url: details.poster_url,
      genre: details.genre,
      runtime_or_pages: details.runtime_or_pages,
      synopsis: details.synopsis,
    }
  })

  const { error: insertError } = await createTitles(supabase, user.id, enriched)
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    added: enriched.length,
    skipped: skippedDuplicates,
  })
}
