import type { Title } from '@/types/database'

export type MoodCardData = {
  mood: string
  posters: (string | null)[]
  color: string
}

/** Distinct hues that still read on the dark theme; assigned uniquely per mood. */
const MOOD_COLORS = [
  '#6C00F8',
  '#0D9488',
  '#2563EB',
  '#E11D48',
  '#CA8A04',
  '#16A34A',
  '#DB2777',
  '#EA580C',
  '#0891B2',
  '#7C3AED',
]

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function colorForIndex(index: number): string {
  return MOOD_COLORS[index % MOOD_COLORS.length]
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
      color: '',
    })
  }

  cards.sort((a, b) => a.mood.localeCompare(b.mood))
  return cards.map((card, index) => ({
    ...card,
    color: colorForIndex(index),
  }))
}
