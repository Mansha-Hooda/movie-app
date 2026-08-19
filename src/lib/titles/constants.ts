import type { MediaType, TimeCommitment, TitleStatus } from '@/types/database'

export const MEDIA_TYPES: { value: MediaType; label: string }[] = [
  { value: 'movie', label: 'Movie' },
  { value: 'show', label: 'Show' },
  { value: 'book', label: 'Book' },
]

export const MOOD_TAGS = [
  'cozy',
  'mind-bending',
  'background-noise',
  'funny',
  'sad',
  'high-focus',
] as const

export type MoodTag = (typeof MOOD_TAGS)[number]

/** Conversational display labels; stored mood_tags values stay unchanged. */
export const MOOD_DISPLAY_LABELS: Record<MoodTag, string> = {
  cozy: 'Something cozy',
  'mind-bending': 'Blow my mind',
  'background-noise': 'Background noise',
  funny: 'Make me laugh',
  sad: 'I want to cry',
  'high-focus': 'High focus',
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
