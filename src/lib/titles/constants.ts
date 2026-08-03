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

export const TIME_COMMITMENTS: { value: TimeCommitment; label: string }[] = [
  { value: 'quick', label: 'Quick' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
]

export const TITLE_STATUSES: { value: TitleStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
]
