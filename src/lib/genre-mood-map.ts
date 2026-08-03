import { MOOD_TAGS, type MoodTag } from '@/lib/titles/constants'

/**
 * Maps genre keywords (case-insensitive substring match) to mood tags.
 * A title with multiple genres can suggest multiple moods.
 */
const GENRE_MOOD_RULES: { keywords: string[]; mood: MoodTag }[] = [
  { keywords: ['comedy', 'comic', 'humor', 'humour', 'sitcom'], mood: 'funny' },
  {
    keywords: ['horror', 'thriller', 'suspense', 'crime', 'war', 'documentary'],
    mood: 'high-focus',
  },
  {
    keywords: ['drama', 'romance', 'romantic', 'tragedy', 'melodrama'],
    mood: 'sad',
  },
  {
    keywords: ['animation', 'animated', 'family', 'kids', 'children'],
    mood: 'cozy',
  },
  {
    keywords: [
      'sci-fi',
      'science fiction',
      'science-fiction',
      'mystery',
      'fantasy',
      'psychological',
    ],
    mood: 'mind-bending',
  },
  {
    keywords: ['reality', 'talk', 'variety', 'game-show', 'game show', 'news'],
    mood: 'background-noise',
  },
]

const MOOD_SET = new Set<string>(MOOD_TAGS)

/**
 * Suggest mood tags from a comma-separated (or freeform) genre string.
 * Returns [] when genre is missing or nothing maps — never invents a default.
 */
export function moodsFromGenre(genre: string | null | undefined): MoodTag[] {
  if (!genre?.trim()) return []

  const normalized = genre.toLowerCase()
  const suggested = new Set<MoodTag>()

  for (const rule of GENRE_MOOD_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      if (MOOD_SET.has(rule.mood)) {
        suggested.add(rule.mood)
      }
    }
  }

  // Preserve MOOD_TAGS display order
  return MOOD_TAGS.filter((tag) => suggested.has(tag))
}
