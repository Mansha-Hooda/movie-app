'use client'

import { useEffect, useId } from 'react'
import { moodLabel } from '@/lib/titles/moods'

export type MoodOptionCount = {
  mood: string
  count: number
}

type MoodListSheetProps = {
  options: MoodOptionCount[]
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
        className="absolute inset-0 bg-page/70"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 mx-auto max-h-[min(32rem,80svh)] max-w-lg overflow-y-auto rounded-t-2xl border border-b-0 border-border bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-lg"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h2 id={titleId} className="sr-only">
          Moods
        </h2>

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
              className={`flex w-full items-center justify-between gap-4 py-3 text-left text-base transition-colors duration-150 ${
                selected ? 'text-accent' : 'text-fg hover:text-accent'
              }`}
            >
              <span>{moodLabel(option.mood)}</span>
              <span className="text-sm text-muted">{option.count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
