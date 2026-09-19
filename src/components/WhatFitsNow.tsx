'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MediaTypeTabs, type MediaTypeTab } from '@/components/MediaTypeTabs'
import { MoodCarousel } from '@/components/MoodCarousel'
import { MoodListSheet } from '@/components/MoodListSheet'
import { MoodPickerOverlay } from '@/components/MoodPickerOverlay'
import { TitleGrid } from '@/components/TitleGrid'
import { collectMoodCards } from '@/lib/moods/picker'
import { UndoWatchedToast } from '@/components/UndoWatchedToast'
import { ItemCount } from '@/components/ItemCount'
import { useBacklogTitles } from '@/hooks/useBacklogTitles'
import { ALL_MOOD, MOOD_TAGS, WATCHED_MOOD } from '@/lib/titles/constants'
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
  } = useBacklogTitles(initialTitles, `bookmark-titles:${userId}`)
  const [mediaType, setMediaType] = useState<MediaTypeTab>('all')
  const [moodOptions, setMoodOptions] = useState<string[]>([ALL_MOOD, WATCHED_MOOD, ...MOOD_TAGS])
  const [mood, setMood] = useState<string>(ALL_MOOD)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [moodSheetOpen, setMoodSheetOpen] = useState(false)
  const pickerArmed = useRef(false)

  useEffect(() => {
    const nextMoods = [
      ALL_MOOD,
      WATCHED_MOOD,
      ...mergeMoodOptions(loadCustomMoods(userId), customMoodsFromTitles(titles)).filter(
        (tag) => tag !== ALL_MOOD && tag !== WATCHED_MOOD,
      ),
    ]
    setMoodOptions(nextMoods)
    setMood((current) => (nextMoods.includes(current) ? current : ALL_MOOD))
  }, [userId, titles])

  const moods = useMemo(
    () => (mood === ALL_MOOD || mood === WATCHED_MOOD ? [] : [mood]),
    [mood],
  )
  const filters = useMemo(
    () => ({ moods, mediaType }),
    [moods, mediaType],
  )
  const filtered = useMemo(() => {
    if (mood === WATCHED_MOOD) {
      let list = uniqueTitles(titles.filter((title) => title.status === 'done'))
      if (mediaType !== 'all') {
        list = list.filter((title) => title.media_type === mediaType)
      }
      return uniqueTitlesByName(list)
    }

    const list = filterTitles(titles, filters)
    return mood === ALL_MOOD ? uniqueTitlesByName(list) : list
  }, [titles, filters, mood, mediaType])
  const filtersActive = mood === WATCHED_MOOD ? false : hasActiveFilters(filters)

  const moodOptionsWithCounts = useMemo(
    () =>
      moodOptions.map((option) => {
        let list: Title[]
        if (option === ALL_MOOD) {
          list = uniqueTitlesByName(filterTitles(titles, { moods: [], mediaType }))
        } else if (option === WATCHED_MOOD) {
          list = uniqueTitles(titles.filter((title) => title.status === 'done'))
          if (mediaType !== 'all') {
            list = list.filter((title) => title.media_type === mediaType)
          }
          list = uniqueTitlesByName(list)
        } else {
          list = filterTitles(titles, { moods: [option], mediaType })
        }
        return { mood: option, count: list.length }
      }),
    [moodOptions, titles, mediaType],
  )

  const moodCards = useMemo(() => collectMoodCards(titles), [titles])

  useEffect(() => {
    if (pickerArmed.current) return
    if (moodCards.length === 0) return
    pickerArmed.current = true
    setPickerOpen(true)
  }, [moodCards.length])

  const emptyMessage =
    mood === WATCHED_MOOD
      ? 'Nothing marked as watched yet.'
      : filtersActive
        ? 'Nothing matches right now — try a different mood or type.'
        : 'Your backlog is empty — add something to watch or read.'

  return (
    <div>
      {pickerOpen ? (
        <MoodPickerOverlay
          cards={moodCards}
          onSelect={(selected) => {
            setMood(selected)
            setPickerOpen(false)
          }}
          onViewFullBacklog={() => {
            setMood(ALL_MOOD)
            setPickerOpen(false)
          }}
          onDismiss={() => setPickerOpen(false)}
        />
      ) : (
        <>
          <MoodCarousel
            moods={moodOptions}
            value={mood}
            onChange={setMood}
            onOpenList={() => setMoodSheetOpen(true)}
          />

          <ItemCount count={filtered.length} />

          <div className="mb-8">
            <MediaTypeTabs value={mediaType} onChange={setMediaType} />
          </div>

          <TitleGrid
            titles={filtered}
            emptyMessage={emptyMessage}
            emptyAction={
              mood === WATCHED_MOOD || filtersActive
                ? null
                : { href: '/add', label: 'Add your first title' }
            }
            onTitleUpdate={handleTitleUpdate}
            onTitleDelete={handleTitleDelete}
          />

          <UndoWatchedToast undo={undo} onUndo={undoAction} onDismiss={dismissUndo} />

          {moodSheetOpen ? (
            <MoodListSheet
              options={moodOptionsWithCounts}
              value={mood}
              onSelect={setMood}
              onClose={() => setMoodSheetOpen(false)}
            />
          ) : null}
        </>
      )}
    </div>
  )
}
