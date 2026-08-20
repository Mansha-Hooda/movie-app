'use client'

import { useEffect, useMemo, useState } from 'react'
import { MediaTypeTabs, type MediaTypeTab } from '@/components/MediaTypeTabs'
import { MoodCarousel } from '@/components/MoodCarousel'
import { TitleGrid } from '@/components/TitleGrid'
import { UndoWatchedToast } from '@/components/UndoWatchedToast'
import { WatchedProgress } from '@/components/WatchedProgress'
import { useBacklogTitles } from '@/hooks/useBacklogTitles'
import { ALL_MOOD, MOOD_TAGS } from '@/lib/titles/constants'
import { customMoodsFromTitles, loadCustomMoods, mergeMoodOptions } from '@/lib/titles/moods'
import { filterTitles, hasActiveFilters, uniqueTitles, uniqueTitlesByName } from '@/lib/titles/filter'
import type { Title } from '@/types/database'

type WhatFitsNowProps = {
  userId: string
  initialTitles: Title[]
}

export function WhatFitsNow({ userId, initialTitles }: WhatFitsNowProps) {
  const {
    titles,
    handleTitleUpdate,
    handleTitleDelete,
    undo,
    undoAction,
    dismissUndo,
  } = useBacklogTitles(initialTitles)
  const [mediaType, setMediaType] = useState<MediaTypeTab>('all')
  const [moodOptions, setMoodOptions] = useState<string[]>([ALL_MOOD, ...MOOD_TAGS])
  const [mood, setMood] = useState<string>(ALL_MOOD)

  useEffect(() => {
    const nextMoods = [
      ALL_MOOD,
      ...mergeMoodOptions(loadCustomMoods(userId), customMoodsFromTitles(titles)).filter(
        (tag) => tag !== ALL_MOOD,
      ),
    ]
    setMoodOptions(nextMoods)
    setMood((current) => (nextMoods.includes(current) ? current : ALL_MOOD))
  }, [userId, titles])

  const moods = useMemo(() => (mood === ALL_MOOD ? [] : [mood]), [mood])
  const filters = useMemo(
    () => ({ moods, mediaType }),
    [moods, mediaType],
  )
  const filtered = useMemo(() => {
    const list = filterTitles(titles, filters)
    return mood === ALL_MOOD ? uniqueTitlesByName(list) : list
  }, [titles, filters, mood])
  const filtersActive = hasActiveFilters(filters)

  const moodTitles = useMemo(
    () =>
      mood === ALL_MOOD
        ? uniqueTitlesByName(titles)
        : uniqueTitles(titles.filter((title) => title.mood_tags.includes(mood))),
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
        onTitleDelete={handleTitleDelete}
      />

      <UndoWatchedToast undo={undo} onUndo={undoAction} onDismiss={dismissUndo} />
    </div>
  )
}
