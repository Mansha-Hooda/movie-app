'use client'

import { useMemo, useState } from 'react'
import { MediaTypeTabs, type MediaTypeTab } from '@/components/MediaTypeTabs'
import { MoodCarousel } from '@/components/MoodCarousel'
import { TitleGrid } from '@/components/TitleGrid'
import { UndoWatchedToast } from '@/components/UndoWatchedToast'
import { WatchedProgress } from '@/components/WatchedProgress'
import { useBacklogTitles } from '@/hooks/useBacklogTitles'
import { MOOD_TAGS, TIME_COMMITMENTS, type MoodTag } from '@/lib/titles/constants'
import { filterTitles, hasActiveFilters } from '@/lib/titles/filter'
import type { TimeCommitment, Title } from '@/types/database'

type WhatFitsNowProps = {
  initialTitles: Title[]
}

export function WhatFitsNow({ initialTitles }: WhatFitsNowProps) {
  const {
    titles,
    handleTitleUpdate,
    undo,
    undoWatched,
    dismissUndo,
    watchedCount,
    totalCount,
  } = useBacklogTitles(initialTitles)
  const [mediaType, setMediaType] = useState<MediaTypeTab>('all')
  const [mood, setMood] = useState<MoodTag>(MOOD_TAGS[0])
  const [time, setTime] = useState<TimeCommitment | null>(null)

  const moods = useMemo(() => [mood], [mood])
  const filters = useMemo(
    () => ({ moods, time, mediaType }),
    [moods, time, mediaType],
  )
  const filtered = useMemo(() => filterTitles(titles, filters), [titles, filters])
  const filtersActive = hasActiveFilters(filters)

  const emptyMessage = filtersActive
    ? 'Nothing matches right now — try a different mood or type.'
    : 'Your backlog is empty — add something to watch or read.'

  return (
    <div>
      <WatchedProgress watchedCount={watchedCount} totalCount={totalCount} />

      <MoodCarousel value={mood} onChange={setMood} />

      <div className="mb-8">
        <MediaTypeTabs value={mediaType} onChange={setMediaType} />
      </div>

      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {TIME_COMMITMENTS.map((option) => {
          const selected = time === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTime((current) => (current === option.value ? null : option.value))}
              className={`rounded-full border px-3 py-1 text-xs transition-colors duration-200 ${
                selected
                  ? 'border-accent bg-accent text-ink'
                  : 'border-border text-muted'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>

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

      <UndoWatchedToast undo={undo} onUndo={undoWatched} onDismiss={dismissUndo} />
    </div>
  )
}
