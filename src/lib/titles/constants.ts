import type { MediaType, TitleStatus, WatchLater } from '@/types/database'

export const MEDIA_TYPES: { value: MediaType; label: string }[] = [
  { value: 'movie', label: 'Movie' },
  { value: 'show', label: 'Show' },
  { value: 'book', label: 'Book' },
]

export const MOOD_TAGS = ['cozy', 'sad', 'mindfuck', 'brainrot'] as const

export type MoodTag = (typeof MOOD_TAGS)[number]

/** Conversational display labels; stored mood_tags values stay unchanged. */
export const MOOD_DISPLAY_LABELS: Record<MoodTag, string> = {
  cozy: 'cozy',
  sad: 'I Want to Cry',
  mindfuck: 'Mindfuck',
  brainrot: 'Brainrot',
}

export const WATCH_LATER_OPTIONS: { value: WatchLater; label: string }[] = [
  { value: 'tonight', label: 'Tonight' },
  { value: 'weekend', label: 'Weekend' },
  { value: 'soon', label: 'Soon' },
]

/** tonight → weekend → soon (legacy duration values map to the same order). */
export const WATCH_LATER_ORDER: Record<string, number> = {
  tonight: 0,
  weekend: 1,
  soon: 2,
  quick: 0,
  medium: 1,
  long: 2,
}

export const TITLE_STATUSES: { value: TitleStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Watched' },
]
