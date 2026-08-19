import {
  MOOD_DISPLAY_LABELS,
  MOOD_TAGS,
  type MoodTag,
} from '@/lib/titles/constants'
import type { Title } from '@/types/database'

function storageKey(userId: string) {
  return `backlog:custom-moods:${userId}`
}

export function isBuiltInMood(value: string): value is MoodTag {
  return (MOOD_TAGS as readonly string[]).includes(value)
}

export function moodLabel(value: string): string {
  if (isBuiltInMood(value)) {
    return MOOD_DISPLAY_LABELS[value]
  }
  return value
}

function normalize(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function keyOf(value: string) {
  return normalize(value).toLowerCase()
}

/** If the typed text matches a built-in slug or label, return that slug. */
export function matchBuiltInMood(raw: string): MoodTag | null {
  const key = keyOf(raw)
  if (!key) return null

  for (const tag of MOOD_TAGS) {
    if (tag === key || MOOD_DISPLAY_LABELS[tag].toLowerCase() === key) {
      return tag
    }
  }
  return null
}

export function uniqueMoods(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const trimmed = normalize(value)
    if (!trimmed) continue
    const key = keyOf(trimmed)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }

  return result
}

export function loadCustomMoods(userId: string): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return uniqueMoods(parsed.filter((item): item is string => typeof item === 'string'))
  } catch {
    return []
  }
}

export function saveCustomMoods(userId: string, moods: string[]) {
  if (typeof window === 'undefined') return
  const extras = uniqueMoods(moods).filter((mood) => !matchBuiltInMood(mood))
  window.localStorage.setItem(storageKey(userId), JSON.stringify(extras))
}

export function addCustomMood(userId: string, mood: string): string[] {
  const next = uniqueMoods([...loadCustomMoods(userId), mood])
  saveCustomMoods(userId, next)
  return next.filter((value) => !matchBuiltInMood(value))
}

export function customMoodsFromTitles(titles: Title[]): string[] {
  return uniqueMoods(titles.flatMap((title) => title.mood_tags)).filter(
    (mood) => !matchBuiltInMood(mood),
  )
}

export function mergeMoodOptions(customMoods: string[], fromTitles: string[] = []): string[] {
  return [...MOOD_TAGS, ...uniqueMoods([...customMoods, ...fromTitles]).filter((mood) => !matchBuiltInMood(mood))]
}
