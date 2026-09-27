'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { WATCH_LATER_OPTIONS } from '@/lib/titles/constants'
import {
  addCustomMood,
  customMoodsFromTitles,
  loadCustomMoods,
  matchBuiltInMood,
  mergeMoodOptions,
  moodLabel,
  uniqueMoods,
} from '@/lib/titles/moods'
import type { Title, WatchLater } from '@/types/database'

type TitleMetaFieldsProps = {
  userId: string
  existingTitles?: Title[]
  suggestedBy: string
  onSuggestedByChange: (value: string) => void
  moodTags: string[]
  onMoodTagsChange: (tags: string[]) => void
  watchLater: WatchLater | null
  onWatchLaterChange: (value: WatchLater | null) => void
  idPrefix: string
  /** When true, tapping the selected commitment chip clears it. */
  allowClearCommitment?: boolean
}

function chipClass(selected: boolean) {
  return `rounded-xl px-4 py-2 text-sm transition duration-150 active:scale-95 ${
    selected ? 'bg-white text-ink' : 'bg-surface text-white'
  }`
}

export function TitleMetaFields({
  userId,
  existingTitles = [],
  suggestedBy,
  onSuggestedByChange,
  moodTags,
  onMoodTagsChange,
  watchLater,
  onWatchLaterChange,
  idPrefix,
  allowClearCommitment = false,
}: TitleMetaFieldsProps) {
  const [customMoods, setCustomMoods] = useState<string[]>([])
  const [customMoodInput, setCustomMoodInput] = useState('')

  useEffect(() => {
    setCustomMoods(
      uniqueMoods([...loadCustomMoods(userId), ...customMoodsFromTitles(existingTitles)]),
    )
  }, [userId, existingTitles])

  const moodOptions = mergeMoodOptions(customMoods)

  function toggleMoodTag(tag: string) {
    onMoodTagsChange(
      moodTags.includes(tag) ? moodTags.filter((item) => item !== tag) : [...moodTags, tag],
    )
  }

  function commitCustomMood() {
    const builtIn = matchBuiltInMood(customMoodInput)
    if (builtIn) {
      setCustomMoodInput('')
      if (!moodTags.includes(builtIn)) onMoodTagsChange([...moodTags, builtIn])
      return
    }

    const trimmed = customMoodInput.trim().replace(/\s+/g, ' ')
    if (!trimmed) return

    const nextCustom = addCustomMood(userId, trimmed)
    const stored =
      nextCustom.find((mood) => mood.toLowerCase() === trimmed.toLowerCase()) ?? trimmed
    setCustomMoods(nextCustom)
    setCustomMoodInput('')
    if (!moodTags.includes(stored)) onMoodTagsChange([...moodTags, stored])
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`${idPrefix}-suggested`} className="mb-2 block text-sm text-muted">
          Suggested by · optional
        </label>
        <input
          id={`${idPrefix}-suggested`}
          type="text"
          placeholder="Who told you about it"
          value={suggestedBy}
          onChange={(event) => onSuggestedByChange(event.target.value)}
          className="field rounded-xl py-3"
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-mood`} className="mb-2 block text-sm text-muted">
          Mood
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
            strokeWidth={1.75}
          />
          <input
            id={`${idPrefix}-mood`}
            type="text"
            placeholder="add a mood"
            value={customMoodInput}
            onChange={(event) => setCustomMoodInput(event.target.value)}
            onBlur={commitCustomMood}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                commitCustomMood()
              }
            }}
            className="field rounded-xl py-3 pl-10"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {moodOptions.map((tag) => {
            const selected = moodTags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleMoodTag(tag)}
                className={chipClass(selected)}
              >
                {moodLabel(tag)}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <span className="mb-3 block text-sm text-muted">When will you watch it</span>
        <div className="flex flex-wrap gap-2">
          {WATCH_LATER_OPTIONS.map((option) => {
            const selected = watchLater === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (allowClearCommitment && selected) {
                    onWatchLaterChange(null)
                    return
                  }
                  onWatchLaterChange(option.value)
                }}
                className={chipClass(selected)}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
