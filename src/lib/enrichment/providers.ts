import type { MediaType } from '@/types/database'
import type { EnrichmentData, SearchResult } from '@/lib/enrichment/types'

export type { EnrichmentData, SearchResult }

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'
const OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'
const FETCH_TIMEOUT_MS = 8000

function getTmdbKey(): string {
  const key = process.env.TMDB_API_KEY
  if (!key) {
    throw new Error('TMDB_API_KEY is not configured')
  }
  return key
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      throw new Error(`Upstream request failed (${response.status})`)
    }

    return (await response.json()) as T
  } finally {
    clearTimeout(timeout)
  }
}

function tmdbPosterUrl(path: string | null | undefined): string | null {
  return path ? `${TMDB_IMAGE_BASE}${path}` : null
}

function yearFromDate(date: string | null | undefined): string | null {
  if (!date || date.length < 4) return null
  return date.slice(0, 4)
}

function joinGenres(genres: { name: string }[] | undefined): string | null {
  if (!genres?.length) return null
  return genres.map((g) => g.name).join(', ')
}

type TmdbMovieSearch = {
  results: {
    id: number
    title: string
    release_date?: string
    poster_path?: string | null
  }[]
}

type TmdbTvSearch = {
  results: {
    id: number
    name: string
    first_air_date?: string
    poster_path?: string | null
  }[]
}

type TmdbMovieDetails = {
  title: string
  overview?: string
  poster_path?: string | null
  runtime?: number | null
  genres?: { name: string }[]
}

type TmdbTvDetails = {
  name: string
  overview?: string
  poster_path?: string | null
  episode_run_time?: number[]
  genres?: { name: string }[]
}

type OpenLibrarySearch = {
  docs: {
    key: string
    title: string
    first_publish_year?: number
    cover_i?: number
    number_of_pages_median?: number
    subject?: string[]
    first_sentence?: string[] | { type?: string; value?: string }
  }[]
}

type OpenLibraryWork = {
  title: string
  description?: string | { value?: string }
  subjects?: string[]
  covers?: number[]
}

type OpenLibraryEditions = {
  entries?: { number_of_pages?: number }[]
}

function openLibrarySentence(
  firstSentence: OpenLibrarySearch['docs'][number]['first_sentence'],
): string | null {
  if (!firstSentence) return null
  if (Array.isArray(firstSentence)) return firstSentence[0]?.trim() || null
  return firstSentence.value?.trim() || null
}

function openLibraryDescription(
  description: OpenLibraryWork['description'],
): string | null {
  if (!description) return null
  if (typeof description === 'string') return description.trim() || null
  return description.value?.trim() || null
}

async function searchMovies(query: string): Promise<SearchResult[]> {
  const key = getTmdbKey()
  const url = `${TMDB_BASE}/search/movie?api_key=${encodeURIComponent(key)}&query=${encodeURIComponent(query)}`
  const data = await fetchJson<TmdbMovieSearch>(url)

  return (data.results ?? []).slice(0, 5).map((item) => ({
    id: String(item.id),
    name: item.title,
    year: yearFromDate(item.release_date),
    poster_url: tmdbPosterUrl(item.poster_path),
  }))
}

async function searchShows(query: string): Promise<SearchResult[]> {
  const key = getTmdbKey()
  const url = `${TMDB_BASE}/search/tv?api_key=${encodeURIComponent(key)}&query=${encodeURIComponent(query)}`
  const data = await fetchJson<TmdbTvSearch>(url)

  return (data.results ?? []).slice(0, 5).map((item) => ({
    id: String(item.id),
    name: item.name,
    year: yearFromDate(item.first_air_date),
    poster_url: tmdbPosterUrl(item.poster_path),
  }))
}

async function searchBooks(query: string): Promise<SearchResult[]> {
  const url = `${OPEN_LIBRARY_SEARCH}?q=${encodeURIComponent(query)}&limit=5&fields=key,title,first_publish_year,cover_i,number_of_pages_median,subject,first_sentence`
  const data = await fetchJson<OpenLibrarySearch>(url)

  return (data.docs ?? []).slice(0, 5).map((doc) => ({
    id: doc.key,
    name: doc.title,
    year: doc.first_publish_year ? String(doc.first_publish_year) : null,
    poster_url: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null,
  }))
}

export async function searchTitles(
  query: string,
  mediaType: MediaType,
): Promise<SearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  switch (mediaType) {
    case 'movie':
      return searchMovies(trimmed)
    case 'show':
      return searchShows(trimmed)
    case 'book':
      return searchBooks(trimmed)
  }
}

async function enrichMovie(id: string): Promise<EnrichmentData> {
  const key = getTmdbKey()
  const data = await fetchJson<TmdbMovieDetails>(
    `${TMDB_BASE}/movie/${encodeURIComponent(id)}?api_key=${encodeURIComponent(key)}`,
  )

  return {
    name: data.title,
    poster_url: tmdbPosterUrl(data.poster_path),
    genre: joinGenres(data.genres),
    runtime_or_pages: data.runtime && data.runtime > 0 ? data.runtime : null,
    synopsis: data.overview?.trim() || null,
  }
}

async function enrichShow(id: string): Promise<EnrichmentData> {
  const key = getTmdbKey()
  const data = await fetchJson<TmdbTvDetails>(
    `${TMDB_BASE}/tv/${encodeURIComponent(id)}?api_key=${encodeURIComponent(key)}`,
  )

  const runtime =
    data.episode_run_time?.find((minutes) => minutes > 0) ??
    data.episode_run_time?.[0] ??
    null

  return {
    name: data.name,
    poster_url: tmdbPosterUrl(data.poster_path),
    genre: joinGenres(data.genres),
    runtime_or_pages: runtime && runtime > 0 ? runtime : null,
    synopsis: data.overview?.trim() || null,
  }
}

async function enrichBook(id: string): Promise<EnrichmentData> {
  const workPath = id.startsWith('/') ? id : `/${id}`

  const work = await fetchJson<OpenLibraryWork>(
    `https://openlibrary.org${workPath}.json`,
  )

  const [editions, search] = await Promise.all([
    fetchJson<OpenLibraryEditions>(
      `https://openlibrary.org${workPath}/editions.json?limit=5`,
    ).catch(() => ({ entries: [] as { number_of_pages?: number }[] })),
    fetchJson<OpenLibrarySearch>(
      `${OPEN_LIBRARY_SEARCH}?q=${encodeURIComponent(work.title)}&limit=5&fields=key,title,cover_i,number_of_pages_median,subject,first_sentence`,
    ).catch(() => ({ docs: [] as OpenLibrarySearch['docs'] })),
  ])

  const searchDoc =
    search.docs?.find((d) => d.key === id || d.key === workPath) ?? search.docs?.[0]

  const pages =
    searchDoc?.number_of_pages_median ??
    editions.entries?.find((e) => e.number_of_pages && e.number_of_pages > 0)
      ?.number_of_pages ??
    null

  const coverId = work.covers?.[0] ?? searchDoc?.cover_i
  const genre =
    work.subjects?.slice(0, 3).join(', ') ||
    searchDoc?.subject?.slice(0, 3).join(', ') ||
    null

  return {
    name: work.title || searchDoc?.title || 'Untitled',
    poster_url: coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
      : null,
    genre,
    runtime_or_pages: pages,
    synopsis:
      openLibraryDescription(work.description) ||
      openLibrarySentence(searchDoc?.first_sentence) ||
      null,
  }
}

export async function enrichTitle(
  id: string,
  mediaType: MediaType,
): Promise<EnrichmentData> {
  switch (mediaType) {
    case 'movie':
      return enrichMovie(id)
    case 'show':
      return enrichShow(id)
    case 'book':
      return enrichBook(id)
  }
}
