import { enrichTitle, searchTitles } from '@/lib/enrichment/providers'
import type { EnrichmentData, SearchResult } from '@/lib/enrichment/types'
import { moodsFromGenre } from '@/lib/genre-mood-map'
import type { MediaType } from '@/types/database'

export type BatchEnrichment = EnrichmentData & {
  mood_tags: string[]
}

function pickBestResult(results: SearchResult[], query: string): SearchResult {
  const normalized = query.trim().toLowerCase()
  const exact = results.find((result) => result.name.toLowerCase() === normalized)
  return exact ?? results[0]
}

const EMPTY: BatchEnrichment = {
  name: '',
  poster_url: null,
  genre: null,
  runtime_or_pages: null,
  synopsis: null,
  mood_tags: [],
}

/** Search + enrich one title. Falls back to the search hit (or the raw name) on failure. */
export async function enrichForInsert(
  name: string,
  mediaType: MediaType,
): Promise<BatchEnrichment> {
  const trimmed = name.trim()
  try {
    const results = await searchTitles(trimmed, mediaType)
    if (results.length === 0) {
      return { ...EMPTY, name: trimmed }
    }

    const best = pickBestResult(results, trimmed)
    try {
      const enrichment = await enrichTitle(best.id, mediaType)
      return {
        name: enrichment.name?.trim() || best.name,
        poster_url: enrichment.poster_url,
        genre: enrichment.genre,
        runtime_or_pages: enrichment.runtime_or_pages,
        synopsis: enrichment.synopsis,
        mood_tags: moodsFromGenre(enrichment.genre),
      }
    } catch {
      return {
        ...EMPTY,
        name: best.name,
        poster_url: best.poster_url,
      }
    }
  } catch {
    return { ...EMPTY, name: trimmed }
  }
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return []

  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(items[index], index)
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  )
  await Promise.all(workers)
  return results
}
