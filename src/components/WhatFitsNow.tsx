'use client'

import { useMemo, useState } from 'react'
import { MediaTypeTabs, type MediaTypeTab } from '@/components/MediaTypeTabs'
import { TitleGrid } from '@/components/TitleGrid'
import { MOOD_TAGS, TIME_COMMITMENTS, type MoodTag } from '@/lib/titles/constants'
import { filterTitles, hasActiveFilters } from '@/lib/titles/filter'
import type { TimeCommitment, Title } from '@/types/database'

type WhatFitsNowProps = {
  initialTitles: Title[]
}

export function WhatFitsNow({ initialTitles }: WhatFitsNowProps) {
  const [titles, setTitles] = useState(initialTitles)
  const [mediaType, setMediaType] = useState<MediaTypeTab>('all')
  const [moods, setMoods] = useState<MoodTag[]>([])
  const [time, setTime] = useState<TimeCommitment | null>(null)

  const filters = useMemo(
    () => ({ moods, time, mediaType }),
    [moods, time, mediaType],
  )
  const filtered = useMemo(() => filterTitles(titles, filters), [titles, filters])
  const filtersActive = hasActiveFilters(filters)

  function toggleMood(tag: MoodTag) {
    setMoods((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    )
  }

  function toggleTime(value: TimeCommitment) {
    setTime((current) => (current === value ? null : value))
  }

  function handleTitleUpdate(updated: Title) {
    setTitles((current) => current.map((t) => (t.id === updated.id ? updated : t)))
  }

  const emptyMessage = filtersActive
    ? 'Nothing matches right now — try different filters.'
    : 'Your backlog is empty — add something to watch or read.'

  return (
    <div>
      <section className="mb-8 space-y-4">
        <div>
          <h2 className="mb-2 text-sm font-medium text-gray-700">Type</h2>
          <MediaTypeTabs value={mediaType} onChange={setMediaType} />
        </div>

        <div>
          <h2 className="mb-2 text-sm font-medium text-gray-700">Mood</h2>
          <div className="flex flex-wrap gap-2">
            {MOOD_TAGS.map((tag) => {
              const selected = moods.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleMood(tag)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    selected
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 text-gray-700'
                  }`}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-medium text-gray-700">Time</h2>
          <div className="flex flex-wrap gap-2">
            {TIME_COMMITMENTS.map((option) => {
              const selected = time === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleTime(option.value)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    selected
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-300 text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <TitleGrid
        titles={filtered}
        emptyMessage={emptyMessage}
        emptyAction={
          filtersActive
            ? null
            : { href: '/add', label: 'Add your first title' }
        }
        onTitleUpdate={handleTitleUpdate}
      />
    </div>
  )
}
