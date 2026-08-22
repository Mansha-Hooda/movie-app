'use client'

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createTitle, findDuplicateInList, findDuplicateTitle } from '@/lib/titles/api'
import { MEDIA_TYPES, WATCH_LATER_OPTIONS } from '@/lib/titles/constants'
import { moodsFromGenre } from '@/lib/genre-mood-map'
import {
  addCustomMood,
  customMoodsFromTitles,
  loadCustomMoods,
  matchBuiltInMood,
  mergeMoodOptions,
  moodLabel,
  saveCustomMoods,
  uniqueMoods,
} from '@/lib/titles/moods'
import type { EnrichmentData, SearchResult } from '@/lib/enrichment/types'
import type { MediaType, Title, WatchLater } from '@/types/database'

type TitleFormProps = {
  userId: string
  initialName?: string
  initialMediaType?: MediaType
  /** Existing titles, used to surface previously saved custom moods. */
  existingTitles?: Title[]
  /** When true with initialName, auto-pick the best search hit and enrich. */
  autoEnrich?: boolean
}

type EnrichmentFields = {
  poster_url: string | null
  genre: string | null
  runtime_or_pages: number | null
  synopsis: string | null
}

const EMPTY_ENRICHMENT: EnrichmentFields = {
  poster_url: null,
  genre: null,
  runtime_or_pages: null,
  synopsis: null,
}

function typeLabel(value: MediaType): string {
  if (value === 'show') return 'TV show'
  if (value === 'book') return 'Book'
  return 'Movie'
}

function pickBestResult(results: SearchResult[], query: string): SearchResult {
  const normalized = query.trim().toLowerCase()
  const exact = results.find((r) => r.name.toLowerCase() === normalized)
  return exact ?? results[0]
}

export function TitleForm({
  userId,
  initialName = '',
  initialMediaType = 'movie',
  existingTitles = [],
  autoEnrich = false,
}: TitleFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [mediaType, setMediaType] = useState<MediaType>(initialMediaType)
  const [suggestedBy, setSuggestedBy] = useState('')
  const [moodTags, setMoodTags] = useState<string[]>([])
  const [customMoods, setCustomMoods] = useState<string[]>([])
  const [customMoodInput, setCustomMoodInput] = useState('')
  const [watchLater, setWatchLater] = useState<WatchLater>('soon')
  const [enrichment, setEnrichment] = useState<EnrichmentFields>(EMPTY_ENRICHMENT)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicate, setDuplicate] = useState<Title | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const searchSeq = useRef(0)
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoEnrichPending = useRef(autoEnrich && initialName.trim().length >= 2)
  const skipNextMediaTypeClear = useRef(true)

  useEffect(() => {
    setCustomMoods(
      uniqueMoods([...loadCustomMoods(userId), ...customMoodsFromTitles(existingTitles)]),
    )
  }, [userId, existingTitles])

  useEffect(() => {
    setDuplicate(findDuplicateInList(existingTitles, name, mediaType))
  }, [existingTitles, name, mediaType])

  useEffect(() => {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setResults([])
      setSearching(false)
      return
    }

    const seq = ++searchSeq.current
    setSearching(true)

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: trimmed,
          media_type: mediaType,
        })
        const response = await fetch(`/api/search-title?${params}`)
        if (!response.ok) {
          if (seq === searchSeq.current) {
            setResults([])
            autoEnrichPending.current = false
          }
          return
        }
        const data = (await response.json()) as { results?: SearchResult[] }
        if (seq !== searchSeq.current) return

        const nextResults = data.results ?? []
        setResults(nextResults)

        if (autoEnrichPending.current && nextResults.length > 0) {
          autoEnrichPending.current = false
          setDropdownOpen(false)
          await applyEnrichment(pickBestResult(nextResults, trimmed), mediaType)
        } else if (!autoEnrichPending.current) {
          setDropdownOpen(true)
        } else {
          autoEnrichPending.current = false
          setDropdownOpen(false)
        }
      } catch {
        if (seq === searchSeq.current) {
          setResults([])
          autoEnrichPending.current = false
        }
      } finally {
        if (seq === searchSeq.current) {
          setSearching(false)
        }
      }
    }, autoEnrichPending.current ? 0 : 400)

    return () => clearTimeout(timer)
  }, [name, mediaType])

  useEffect(() => {
    if (skipNextMediaTypeClear.current) {
      skipNextMediaTypeClear.current = false
      return
    }
    setEnrichment(EMPTY_ENRICHMENT)
    setResults([])
    setMoodTags([])
  }, [mediaType])

  const moodOptions = mergeMoodOptions(customMoods)

  function toggleMoodTag(tag: string) {
    setMoodTags((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    )
  }

  function commitCustomMoodInput(currentTags: string[] = moodTags): string[] {
    const builtIn = matchBuiltInMood(customMoodInput)
    if (builtIn) {
      setCustomMoodInput('')
      return currentTags.includes(builtIn) ? currentTags : [...currentTags, builtIn]
    }

    const trimmed = customMoodInput.trim().replace(/\s+/g, ' ')
    if (!trimmed) return currentTags

    const nextCustom = addCustomMood(userId, trimmed)
    const stored =
      nextCustom.find((mood) => mood.toLowerCase() === trimmed.toLowerCase()) ?? trimmed
    setCustomMoods(nextCustom)
    setCustomMoodInput('')
    return currentTags.includes(stored) ? currentTags : [...currentTags, stored]
  }

  function handleAddCustomMood() {
    setMoodTags(commitCustomMoodInput())
  }

  function clearEnrichmentOnManualEdit(nextName: string) {
    setName(nextName)
    setEnrichment(EMPTY_ENRICHMENT)
    autoEnrichPending.current = false
  }

  async function applyEnrichment(result: SearchResult, type: MediaType) {
    setSelecting(true)
    setDropdownOpen(false)
    setResults([])
    setName(result.name)

    try {
      const params = new URLSearchParams({
        id: result.id,
        media_type: type,
      })
      const response = await fetch(`/api/search-title?${params}`)
      if (!response.ok) {
        setEnrichment({
          poster_url: result.poster_url,
          genre: null,
          runtime_or_pages: null,
          synopsis: null,
        })
        setMoodTags([])
        return
      }

      const data = (await response.json()) as { enrichment?: EnrichmentData }
      if (data.enrichment) {
        setName(data.enrichment.name)
        setEnrichment({
          poster_url: data.enrichment.poster_url,
          genre: data.enrichment.genre,
          runtime_or_pages: data.enrichment.runtime_or_pages,
          synopsis: data.enrichment.synopsis,
        })
        setMoodTags(moodsFromGenre(data.enrichment.genre))
      }
    } catch {
      setEnrichment({
        poster_url: result.poster_url,
        genre: null,
        runtime_or_pages: null,
        synopsis: null,
      })
      setMoodTags([])
    } finally {
      setSelecting(false)
    }
  }

  async function handleSelectResult(result: SearchResult) {
    await applyEnrichment(result, mediaType)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const tags = commitCustomMoodInput()
    setMoodTags(tags)

    const supabase = createClient()
    const { data: existing, error: duplicateError } = await findDuplicateTitle(
      supabase,
      userId,
      name,
      mediaType,
    )

    if (duplicateError) {
      setSubmitting(false)
      setError(duplicateError.message)
      return
    }

    if (existing) {
      setDuplicate(existing)
      setSubmitting(false)
      return
    }

    const { error: createError } = await createTitle(supabase, userId, {
      name,
      media_type: mediaType,
      suggested_by: suggestedBy,
      mood_tags: tags,
      time_commitment: watchLater,
      poster_url: enrichment.poster_url,
      genre: enrichment.genre,
      runtime_or_pages: enrichment.runtime_or_pages,
      synopsis: enrichment.synopsis,
    })

    setSubmitting(false)

    if (createError) {
      setError(createError.message)
      return
    }

    saveCustomMoods(userId, [...loadCustomMoods(userId), ...tags])

    router.push('/')
    router.refresh()
  }

  const hasEnrichment =
    enrichment.poster_url ||
    enrichment.genre ||
    enrichment.runtime_or_pages ||
    enrichment.synopsis

  const selectChip = (selected: boolean) =>
    `rounded-full border px-4 py-2 text-sm transition duration-150 active:scale-95 ${
      selected
        ? 'border-white bg-white text-ink'
        : 'border-fg/50 bg-transparent text-fg'
    }`

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <span className="mb-2 block text-sm text-muted">Type</span>
        <div className="flex rounded-2xl bg-surface p-1">
          {MEDIA_TYPES.map((option) => {
            const selected = mediaType === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setMediaType(option.value)}
                className={`flex-1 rounded-xl py-2.5 text-sm transition duration-150 ${
                  selected ? 'bg-white font-medium text-ink' : 'text-muted'
                }`}
              >
                {typeLabel(option.value)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="relative">
        <label htmlFor="name" className="mb-2 block text-sm text-muted">
          Name
        </label>
        <input
          id="name"
          type="text"
          required
          autoComplete="off"
          placeholder="Search a title"
          value={name}
          onChange={(event) => clearEnrichmentOnManualEdit(event.target.value)}
          onFocus={() => {
            if (results.length > 0) setDropdownOpen(true)
          }}
          onBlur={() => {
            blurTimeout.current = setTimeout(() => setDropdownOpen(false), 150)
          }}
          className="field rounded-xl py-3"
        />
        {searching && (
          <p className="mt-1 text-xs text-muted">Searching…</p>
        )}
        {selecting && (
          <p className="mt-1 text-xs text-muted">Loading details…</p>
        )}

        {dropdownOpen && results.length > 0 && (
          <ul
            className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-surface shadow-sm"
            onMouseDown={(event) => event.preventDefault()}
          >
            {results.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (blurTimeout.current) clearTimeout(blurTimeout.current)
                    void handleSelectResult(result)
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-150 hover:bg-page"
                >
                  {result.poster_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={result.poster_url}
                      alt=""
                      className="h-12 w-8 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-8 shrink-0 items-center justify-center rounded bg-page text-[10px] text-muted">
                      N/A
                    </div>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-fg">
                      {result.name}
                    </span>
                    {result.year && (
                      <span className="text-xs text-muted">{result.year}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {hasEnrichment && (
        <div className="rounded-xl border border-border bg-surface p-3 text-sm text-muted">
          <div className="flex gap-3">
            {enrichment.poster_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={enrichment.poster_url}
                alt=""
                className="h-20 w-14 shrink-0 rounded object-cover"
              />
            ) : null}
            <div className="min-w-0 space-y-1">
              {enrichment.genre && <p>Genre: {enrichment.genre}</p>}
              {enrichment.runtime_or_pages != null && (
                <p>
                  {mediaType === 'book' ? 'Pages' : 'Runtime'}:{' '}
                  {enrichment.runtime_or_pages}
                  {mediaType === 'book' ? '' : ' min'}
                </p>
              )}
              {enrichment.synopsis && (
                <p className="line-clamp-3 text-xs text-muted">{enrichment.synopsis}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="suggested_by" className="mb-2 block text-sm text-muted">
          Suggested by · optional
        </label>
        <input
          id="suggested_by"
          type="text"
          placeholder="Who told you about it"
          value={suggestedBy}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setSuggestedBy(event.target.value)
          }
          className="field rounded-xl py-3"
        />
      </div>

      <div>
        <label htmlFor="custom_mood" className="mb-2 block text-sm text-muted">
          Mood
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
            strokeWidth={1.75}
          />
          <input
            id="custom_mood"
            type="text"
            placeholder="add a mood"
            value={customMoodInput}
            onChange={(event) => setCustomMoodInput(event.target.value)}
            onBlur={handleAddCustomMood}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleAddCustomMood()
              }
            }}
            className="field rounded-xl py-3 pl-10"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {moodOptions.map((tag) => {
            const selected = moodTags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleMoodTag(tag)}
                className={selectChip(selected)}
              >
                {moodLabel(tag)}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <span className="mb-3 block text-sm text-muted">When will you watch it</span>
        <div className="flex flex-wrap gap-2">
          {WATCH_LATER_OPTIONS.map((option) => {
            const selected = watchLater === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setWatchLater(option.value)}
                className={selectChip(selected)}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {duplicate && (
        <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm" role="status">
          <p className="text-fg">Already in your backlog</p>
          <p className="mt-0.5 text-xs text-muted">
            {duplicate.status === 'done'
              ? duplicate.media_type === 'book'
                ? 'You already marked this as read.'
                : 'You already marked this as watched.'
              : `${duplicate.name} is already saved as a ${duplicate.media_type}.`}
          </p>
          <Link
            href="/backlog"
            className="mt-2 inline-block text-sm text-accent transition-colors hover:brightness-110"
          >
            View in backlog
          </Link>
        </div>
      )}

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || Boolean(duplicate)}
        className="w-full rounded-xl bg-accent py-3.5 text-base font-semibold text-white transition duration-150 hover:brightness-110 active:scale-95 disabled:opacity-60"
      >
        {submitting ? 'Adding…' : duplicate ? 'Already in your backlog' : 'Add title'}
      </button>
    </form>
  )
}
