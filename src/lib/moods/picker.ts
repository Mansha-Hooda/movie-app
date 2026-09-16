import type { Title } from '@/types/database'

export type MoodGradient = {
  from: string
  via: string
  to: string
}

export type MoodCardData = {
  mood: string
  posters: (string | null)[]
  gradient: MoodGradient
}

/** Purple / teal / violet / dusk — assigned by hashing the mood name. */
const GRADIENTS: MoodGradient[] = [
  { from: '#9B7DFF', via: '#7A5AF8', to: '#2A1848' },
  { from: '#5EEAD4', via: '#14B8A6', to: '#0F2F2C' },
  { from: '#818CF8', via: '#6366F1', to: '#1E1B4B' },
  { from: '#C4B5FD', via: '#8B5CF6', to: '#2E1064' },
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

export function gradientForMood(mood: string): MoodGradient {
  return GRADIENTS[hashMoodName(mood) % GRADIENTS.length]
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
      gradient: gradientForMood(mood),
    })
  }

  cards.sort((a, b) => a.mood.localeCompare(b.mood))
  return cards
}
