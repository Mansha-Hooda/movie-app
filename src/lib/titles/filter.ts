import { WATCH_LATER_ORDER } from '@/lib/titles/constants'
import type { MediaType, Title } from '@/types/database'

export type MediaTypeFilter = MediaType | 'all'

export type TitleFilters = {
  moods: string[]
  mediaType?: MediaTypeFilter
}

/** True when mood filters are active (media tab is separate). */
export function hasMoodFilters(filters: TitleFilters): boolean {
  return filters.moods.length > 0
}

/** True when any filter including a non-All media tab is active. */
export function hasActiveFilters(filters: TitleFilters): boolean {
  const mediaActive = Boolean(filters.mediaType && filters.mediaType !== 'all')
  return hasMoodFilters(filters) || mediaActive
}

export function uniqueTitles(titles: Title[]): Title[] {
  const seen = new Set<string>()
  const unique: Title[] = []

  for (const title of titles) {
    if (seen.has(title.id)) continue
    seen.add(title.id)
    unique.push(title)
  }

  return unique
}

export function uniqueTitlesByName(titles: Title[]): Title[] {
  const seen = new Set<string>()
  const unique: Title[] = []

  for (const title of uniqueTitles(titles)) {
    const key = `${title.media_type}::${title.name.trim().toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(title)
  }

  return unique
}

export function sortByWatchLater(titles: Title[]): Title[] {
  return [...titles].sort((a, b) => {
    const orderA = WATCH_LATER_ORDER[a.time_commitment] ?? 3
    const orderB = WATCH_LATER_ORDER[b.time_commitment] ?? 3
    return orderA - orderB
  })
}

/**
 * Filters titles for list views.
 * - Always hide status === 'done' (watched items are counted separately).
 * - Mood inactive: show backlog and in_progress.
 * - Mood active: only status === 'backlog', plus mood overlap.
 * - mediaType (when not 'all'): further restrict to that media_type.
 * - Sorted tonight, then weekend, then soon.
 */
export function filterTitles(titles: Title[], filters: TitleFilters): Title[] {
  let results = uniqueTitles(titles).filter((title) => title.status !== 'done')

  if (hasMoodFilters(filters)) {
    results = results.filter((title) => {
      if (title.status !== 'backlog') {
        return false
      }

      if (filters.moods.length > 0) {
        const overlaps = filters.moods.some((mood) => title.mood_tags.includes(mood))
        if (!overlaps) {
          return false
        }
      }

      return true
    })
  }

  if (filters.mediaType && filters.mediaType !== 'all') {
    results = results.filter((title) => title.media_type === filters.mediaType)
  }

  return sortByWatchLater(results)
}
