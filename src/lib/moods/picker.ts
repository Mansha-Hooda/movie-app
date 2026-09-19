import type { Title } from '@/types/database'

export type MoodCardData = {
  mood: string
  posters: (string | null)[]
  color: string
}

/** Distinct purples around the primary accent, assigned uniquely per mood. */
const MOOD_COLORS = [
  '#6C00F8',
  '#7C3AED',
  '#5B21B6',
  '#8B5CF6',
  '#4C1D95',
  '#A78BFA',
  '#6D28D9',
  '#4338CA',
  '#7E22CE',
  '#5B4BDB',
]

export function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function newestPosterUrls(titles: Title[], limit = 3): string[] {
  const newest = [...titles].sort(
    (a, b) => new Date(b.date_added).getTime() - new Date(a.date_added).getTime(),
  )
  const urls: string[] = []
  const seen = new Set<string>()

  for (const title of newest) {
    if (seen.has(title.id) || !title.poster_url) continue
    seen.add(title.id)
    urls.push(title.poster_url)
    if (urls.length === limit) break
  }

  return urls
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
      posters: newestPosterUrls(unique),
      color: '',
    })
  }

  cards.sort((a, b) => a.mood.localeCompare(b.mood))
  return cards.map((card, index) => ({
    ...card,
    color: colorForIndex(index),
  }))
}
