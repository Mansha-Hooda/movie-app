'use client'

import { useEffect, useMemo, useState } from 'react'
import { MediaTypeTabs, type MediaTypeTab } from '@/components/MediaTypeTabs'
import { MoodCarousel } from '@/components/MoodCarousel'
import { TitleGrid } from '@/components/TitleGrid'
import { UndoWatchedToast } from '@/components/UndoWatchedToast'
import { WatchedProgress } from '@/components/WatchedProgress'
import { useBacklogTitles } from '@/hooks/useBacklogTitles'
import { MOOD_TAGS } from '@/lib/titles/constants'
import { customMoodsFromTitles, loadCustomMoods, mergeMoodOptions } from '@/lib/titles/moods'
import { filterTitles, hasActiveFilters } from '@/lib/titles/filter'
import type { Title } from '@/types/database'

type WhatFitsNowProps = {
  userId: string
  initialTitles: Title[]
}

export function WhatFitsNow({ userId, initialTitles }: WhatFitsNowProps) {
  const {
    titles,
    handleTitleUpdate,
    undo,
    undoWatched,
    dismissUndo,
  } = useBacklogTitles(initialTitles)
  const [mediaType, setMediaType] = useState<MediaTypeTab>('all')
  const [moodOptions, setMoodOptions] = useState<string[]>([...MOOD_TAGS])
  const [mood, setMood] = useState<string>(MOOD_TAGS[0])

  useEffect(() => {
    const nextMoods = mergeMoodOptions(
      loadCustomMoods(userId),
      customMoodsFromTitles(titles),
    )
    setMoodOptions(nextMoods)
    setMood((current) => (nextMoods.includes(current) ? current : nextMoods[0]))
  }, [userId, titles])

  const moods = useMemo(() => [mood], [mood])
  const filters = useMemo(
    () => ({ moods, mediaType }),
    [moods, mediaType],
  )
  const filtered = useMemo(() => filterTitles(titles, filters), [titles, filters])
  const filtersActive = hasActiveFilters(filters)

  const moodTitles = useMemo(
    () => titles.filter((title) => title.mood_tags.includes(mood)),
    [titles, mood],
  )
  const moodTotal = moodTitles.length
  const moodWatched = moodTitles.filter((title) => title.status === 'done').length

  const emptyMessage = filtersActive
    ? 'Nothing matches right now — try a different mood or type.'
    : 'Your backlog is empty — add something to watch or read.'

  return (
    <div>
      <MoodCarousel moods={moodOptions} value={mood} onChange={setMood} />

      <WatchedProgress watchedCount={moodWatched} totalCount={moodTotal} />

      <div className="mb-8">
        <MediaTypeTabs value={mediaType} onChange={setMediaType} />
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
