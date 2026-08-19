import type { MediaType, TimeCommitment, TitleStatus } from '@/types/database'

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

export const TIME_COMMITMENTS: { value: TimeCommitment; label: string }[] = [
  { value: 'quick', label: 'Quick' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
]

export const TITLE_STATUSES: { value: TitleStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Watched' },
]
