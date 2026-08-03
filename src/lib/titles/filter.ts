import type { MediaType, TimeCommitment, Title } from '@/types/database'

export type MediaTypeFilter = MediaType | 'all'

export type TitleFilters = {
  moods: string[]
  time: TimeCommitment | null
  mediaType?: MediaTypeFilter
}

/** True when mood and/or time filters are active (media tab is separate). */
export function hasMoodOrTimeFilters(filters: TitleFilters): boolean {
  return filters.moods.length > 0 || filters.time !== null
}

/** True when any filter including a non-All media tab is active. */
export function hasActiveFilters(filters: TitleFilters): boolean {
  const mediaActive = Boolean(filters.mediaType && filters.mediaType !== 'all')
  return hasMoodOrTimeFilters(filters) || mediaActive
}

/**
 * Filters titles for list views.
 * - Mood/time inactive: keep all statuses.
 * - Mood/time active: only status === 'backlog', plus mood overlap and/or time match.
 * - mediaType (when not 'all'): further restrict to that media_type.
 */
export function filterTitles(titles: Title[], filters: TitleFilters): Title[] {
  let results = titles

  if (hasMoodOrTimeFilters(filters)) {
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

      if (filters.time !== null && title.time_commitment !== filters.time) {
        return false
      }

      return true
    })
  }

  if (filters.mediaType && filters.mediaType !== 'all') {
    results = results.filter((title) => title.media_type === filters.mediaType)
  }

  return results
}
