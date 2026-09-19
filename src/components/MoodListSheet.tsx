'use client'

import { useEffect, useId } from 'react'
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close mood list"
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[min(40rem,88svh)] max-w-lg flex-col rounded-t-2xl bg-black px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-lg"
      >
        <div className="mx-auto mb-5 h-1 w-10 shrink-0 rounded-full bg-border" />
        <h2 id={titleId} className="mb-5 shrink-0 text-xl font-semibold tracking-tight text-white">
          Your Moods
        </h2>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {options.map((option) => {
            const selected = option.mood === value
            return (
              <button
                key={option.mood}
                type="button"
                onClick={() => {
                  onSelect(option.mood)
                  onClose()
                }}
                className={`flex w-full items-center gap-4 rounded-[1.35rem] px-3.5 py-3 text-left transition-colors duration-150 ${
                  selected ? 'bg-white' : 'bg-[#1c1c1e]'
                }`}
              >
                {option.posters.length > 0 ? (
                  <PosterFan posters={option.posters} variant="thumb" />
                ) : (
                  <div
                    className={`h-14 w-14 shrink-0 rounded-xl ${
                      selected ? 'bg-black/10' : 'bg-[#2a2a2c]'
                    }`}
                  />
                )}
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
      </div>
    </div>
  )
}
