'use client'

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createTitle } from '@/lib/titles/api'
import { MEDIA_TYPES, TIME_COMMITMENTS } from '@/lib/titles/constants'
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
import type { MediaType, TimeCommitment, Title } from '@/types/database'

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
  const [timeCommitment, setTimeCommitment] = useState<TimeCommitment>('medium')
  const [enrichment, setEnrichment] = useState<EnrichmentFields>(EMPTY_ENRICHMENT)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  function handleAddCustomMood() {
    const builtIn = matchBuiltInMood(customMoodInput)
    if (builtIn) {
      setMoodTags((current) =>
        current.includes(builtIn) ? current : [...current, builtIn],
      )
      setCustomMoodInput('')
      return
    }

    const trimmed = customMoodInput.trim().replace(/\s+/g, ' ')
    if (!trimmed) return

    const nextCustom = addCustomMood(userId, trimmed)
    const stored =
      nextCustom.find((mood) => mood.toLowerCase() === trimmed.toLowerCase()) ?? trimmed
    setCustomMoods(nextCustom)
    setMoodTags((current) => (current.includes(stored) ? current : [...current, stored]))
    setCustomMoodInput('')
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

    const supabase = createClient()
    const { error: createError } = await createTitle(supabase, userId, {
      name,
      media_type: mediaType,
      suggested_by: suggestedBy,
      mood_tags: moodTags,
      time_commitment: timeCommitment,
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

    saveCustomMoods(userId, [...loadCustomMoods(userId), ...moodTags])

    router.push('/')
    router.refresh()
  }

  const hasEnrichment =
    enrichment.poster_url ||
    enrichment.genre ||
    enrichment.runtime_or_pages ||
    enrichment.synopsis

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <span className="mb-2 block text-sm text-muted">Type</span>
        <div className="flex flex-wrap gap-2">
          {MEDIA_TYPES.map((option) => {
            const selected = mediaType === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setMediaType(option.value)}
                className={`chip ${selected ? 'chip-on' : 'chip-off'}`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="relative">
        <label htmlFor="name" className="mb-1 block text-sm text-muted">
          Name
        </label>
        <input
          id="name"
          type="text"
          required
          autoComplete="off"
          value={name}
          onChange={(event) => clearEnrichmentOnManualEdit(event.target.value)}
          onFocus={() => {
            if (results.length > 0) setDropdownOpen(true)
          }}
          onBlur={() => {
            blurTimeout.current = setTimeout(() => setDropdownOpen(false), 150)
          }}
          className="field"
        />
        {searching && (
          <p className="mt-1 text-xs text-muted">Searching…</p>
        )}
        {selecting && (
          <p className="mt-1 text-xs text-muted">Loading details…</p>
        )}

        {dropdownOpen && results.length > 0 && (
          <ul
            className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-surface shadow-sm"
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
        <div className="rounded-lg border border-border bg-surface p-3 text-sm text-muted">
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
        <label htmlFor="suggested_by" className="mb-1 block text-sm text-muted">
          Suggested by <span className="text-muted/80">(optional)</span>
        </label>
        <input
          id="suggested_by"
          type="text"
          value={suggestedBy}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setSuggestedBy(event.target.value)
          }
          className="field"
        />
      </div>

      <div>
        <span className="mb-2 block text-sm text-muted">Moods</span>
        <div className="flex flex-wrap gap-2">
          {moodOptions.map((tag) => {
            const selected = moodTags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleMoodTag(tag)}
                className={`chip ${selected ? 'chip-on' : 'chip-off'}`}
              >
                {moodLabel(tag)}
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            id="custom_mood"
            type="text"
            value={customMoodInput}
            onChange={(event) => setCustomMoodInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                handleAddCustomMood()
              }
            }}
            placeholder="Add your own mood"
            className="field"
          />
          <button
            type="button"
            onClick={handleAddCustomMood}
            disabled={!customMoodInput.trim()}
            className="btn-secondary shrink-0 px-3"
          >
            Add
          </button>
        </div>
      </div>

      <div>
        <span className="mb-2 block text-sm text-muted">Time commitment</span>
        <div className="flex flex-wrap gap-2">
          {TIME_COMMITMENTS.map((option) => {
            const selected = timeCommitment === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setTimeCommitment(option.value)}
                className={`chip ${selected ? 'chip-on' : 'chip-off'}`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Adding…' : 'Add title'}
      </button>
    </form>
  )
}
