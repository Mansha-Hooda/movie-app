import 'server-only'

import { searchTitles } from '@/lib/enrichment/providers'
import type { MediaType } from '@/types/database'

/** Change this when you want sources for another country. */
export const WATCH_REGION = 'IN'

const WATCHMODE_BASE = 'https://api.watchmode.com/v1'
const CACHE_TTL_MS = 12 * 60 * 60 * 1000
const TYPE_RANK: Record<string, number> = {
  sub: 0,
  free: 1,
  tve: 2,
  rent: 3,
  buy: 4,
}

export type WatchProvider = {
  id: number
  name: string
  logoUrl: string | null
  webUrl: string
  iosUrl: string | null
  androidUrl: string | null
}

type CacheEntry = {
  at: number
  providers: WatchProvider[]
}

type WatchmodeSource = {
  source_id?: number
  name?: string
  type?: string
  web_url?: string
  ios_url?: string
  android_url?: string
}

type SourceCatalogItem = {
  id?: number
  name?: string
  logo_100px?: string
}

const resultCache = new Map<string, CacheEntry>()
let catalogCache: { at: number; logos: Map<number, string> } | null = null

function getWatchmodeKey(): string | null {
  const key = process.env.WATCHMODE_API_KEY
  return key?.trim() || null
}

function isRealLink(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed
  return null
}

async function watchmodeJson<T>(path: string): Promise<T | null> {
  const key = getWatchmodeKey()
  if (!key) return null

  const response = await fetch(`${WATCHMODE_BASE}${path}`, {
    headers: {
      Accept: 'application/json',
      'X-API-Key': key,
    },
    cache: 'no-store',
  })

  if (!response.ok) return null
  return (await response.json()) as T
}

async function sourceLogos(): Promise<Map<number, string>> {
  if (catalogCache && Date.now() - catalogCache.at < CACHE_TTL_MS) {
    return catalogCache.logos
  }

  const data = await watchmodeJson<SourceCatalogItem[]>(
    `/sources/?regions=${encodeURIComponent(WATCH_REGION)}`,
  )
  const logos = new Map<number, string>()
  for (const item of data ?? []) {
    if (typeof item.id === 'number' && item.logo_100px) {
      logos.set(item.id, item.logo_100px)
    }
  }
  catalogCache = { at: Date.now(), logos }
  return logos
}

async function resolveTmdbId(name: string, mediaType: 'movie' | 'show'): Promise<string | null> {
  const results = await searchTitles(name, mediaType)
  const normalized = name.trim().toLowerCase()
  const exact = results.find((result) => result.name.trim().toLowerCase() === normalized)
  return (exact ?? results[0])?.id ?? null
}

function watchmodeTitleId(tmdbId: string, mediaType: 'movie' | 'show'): string {
  return mediaType === 'show' ? `tv-${tmdbId}` : `movie-${tmdbId}`
}

function normalizeSources(
  sources: WatchmodeSource[],
  logos: Map<number, string>,
): WatchProvider[] {
  const best = new Map<number, WatchmodeSource>()

  for (const source of sources) {
    if (typeof source.source_id !== 'number' || !isRealLink(source.web_url)) continue
    const current = best.get(source.source_id)
    const nextRank = TYPE_RANK[source.type ?? ''] ?? 9
    const currentRank = TYPE_RANK[current?.type ?? ''] ?? 9
    if (!current || nextRank < currentRank) {
      best.set(source.source_id, source)
    }
  }

  return [...best.values()]
    .sort((a, b) => (TYPE_RANK[a.type ?? ''] ?? 9) - (TYPE_RANK[b.type ?? ''] ?? 9))
    .map((source) => ({
      id: source.source_id as number,
      name: source.name?.trim() || 'Watch',
      logoUrl: logos.get(source.source_id as number) ?? null,
      webUrl: isRealLink(source.web_url) as string,
      iosUrl: isRealLink(source.ios_url),
      androidUrl: isRealLink(source.android_url),
    }))
}

export async function getWatchProviders(input: {
  name: string
  mediaType: MediaType
  tmdbId?: string | null
}): Promise<WatchProvider[]> {
  if (input.mediaType === 'book') return []

  const name = input.name.trim()
  if (!name && !input.tmdbId) return []

  const cacheKey = `${WATCH_REGION}:${input.mediaType}:${input.tmdbId ?? name.toLowerCase()}`
  const cached = resultCache.get(cacheKey)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.providers
  }

  try {
    const tmdbId =
      input.tmdbId?.trim() ||
      (await resolveTmdbId(name, input.mediaType))
    if (!tmdbId) {
      resultCache.set(cacheKey, { at: Date.now(), providers: [] })
      return []
    }

    const titleId = watchmodeTitleId(tmdbId, input.mediaType)
    const [sources, logos] = await Promise.all([
      watchmodeJson<WatchmodeSource[]>(
        `/title/${encodeURIComponent(titleId)}/sources/?regions=${encodeURIComponent(WATCH_REGION)}`,
      ),
      sourceLogos(),
    ])

    const providers = normalizeSources(sources ?? [], logos)
    resultCache.set(cacheKey, { at: Date.now(), providers })
    return providers
  } catch (error) {
    console.error('[watch-providers]', error instanceof Error ? error.message : error)
    return []
  }
}
