import type { Title } from '@/types/database'

export type MoodCardData = {
  mood: string
  posters: (string | null)[]
  color: string
}

/** Dark-theme purples and indigos around the primary accent. */
const MOOD_COLORS = [
  '#6C00F8',
  '#7C3AED',
  '#4F46E5',
  '#5B21B6',
  '#3730A3',
  '#6D28D9',
  '#4338CA',
  '#0F766E',
]

export function hashMoodName(mood: string): number {
  let hash = 0
  for (let i = 0; i < mood.length; i += 1) {
    hash = (hash * 33 + mood.charCodeAt(i)) >>> 0
  }
  return hash
}

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function colorForMood(mood: string): string {
  return MOOD_COLORS[hashMoodName(mood) % MOOD_COLORS.length]
}

/**
 * Moods that have at least one unwatched backlog title, with the 3 newest posters.
 */
export function collectMoodCards(titles: Title[]): MoodCardData[] {
  const byMood = new Map<string, Title[]>()

  for (const title of titles) {
    if (title.status !== 'backlog') continue
    for (const raw of title.mood_tags) {
      const mood = raw.trim()
      if (!mood) continue
      const list = byMood.get(mood) ?? []
      list.push(title)
      byMood.set(mood, list)
    }
  }

  const cards: MoodCardData[] = []

  for (const [mood, tagged] of byMood) {
    const newest = [...tagged].sort(
      (a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime(),
    )
    const unique: Title[] = []
    const seen = new Set<string>()
    for (const title of newest) {
      if (seen.has(title.id)) continue
      seen.add(title.id)
      unique.push(title)
      if (unique.length === 3) break
    }

    cards.push({
      mood,
      posters: unique.map((title) => title.poster_url),
      color: colorForMood(mood),
    })
  }

  cards.sort((a, b) => a.mood.localeCompare(b.mood))
  return cards
}
