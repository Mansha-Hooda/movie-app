'use client'

import { useId, useMemo } from 'react'
import { BottomSheet } from '@/components/BottomSheet'
import { PosterFan } from '@/components/PosterFan'
import { moodLabel } from '@/lib/titles/moods'

export type MoodSheetOption = {
  mood: string
  count: number
  posters: string[]
}

type MoodListSheetProps = {
  options: MoodSheetOption[]
  value: string
  onSelect: (mood: string) => void
  onClose: () => void
}

export function MoodListSheet({
  options,
  value,
  onSelect,
  onClose,
}: MoodListSheetProps) {
  const titleId = useId()
  const ordered = useMemo(() => {
    const selected = options.filter((option) => option.mood === value)
    const rest = options.filter((option) => option.mood !== value)
    return [...selected, ...rest]
  }, [options, value])

  return (
    <BottomSheet labelledBy={titleId} maxHeight="60svh" onClose={onClose}>
      <h2 id={titleId} className="mb-5 shrink-0 text-xl font-semibold tracking-tight text-fg">
        Your Moods
      </h2>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {ordered.map((option) => {
          const selected = option.mood === value
          return (
            <button
              key={option.mood}
              type="button"
              onClick={() => {
                onSelect(option.mood)
                onClose()
              }}
              className={`flex w-full items-center gap-4 rounded-xl px-3.5 py-3 text-left transition-colors duration-150 ${
                selected ? 'bg-white' : 'bg-[#1c1c1e]'
              }`}
            >
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg ${
                  selected ? 'bg-[#d0d0d0]' : 'bg-[#3a3a3c]'
                }`}
              >
                {option.posters.length > 0 ? (
                  <PosterFan posters={option.posters} variant="thumb" />
                ) : null}
              </div>
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[1.05rem] font-semibold ${
                    selected ? 'text-ink' : 'text-white'
                  }`}
                >
                  {moodLabel(option.mood)}
                </span>
                <span
                  className={`mt-1 block text-sm ${
                    selected ? 'text-ink/45' : 'text-white/45'
                  }`}
                >
                  {option.count} {option.count === 1 ? 'item' : 'items'}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}
