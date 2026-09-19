'use client'

import { useEffect, useId, useMemo } from 'react'
import { motion, type PanInfo } from 'framer-motion'
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

const SHEET_SPRING = { type: 'spring' as const, stiffness: 420, damping: 38, mass: 0.85 }

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

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.y > 110 || info.velocity.y > 700) {
      onClose()
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={SHEET_SPRING}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.02, bottom: 0.55 }}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
    >
      <button
        type="button"
        aria-label="Close mood list"
        className="min-h-0 flex-1"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="mx-auto flex w-full max-h-[60svh] max-w-lg flex-col rounded-t-2xl bg-black px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex w-full shrink-0 flex-col items-center pb-4"
        >
          <span className="h-1 w-10 rounded-full bg-muted" />
        </button>

        <h2 id={titleId} className="mb-5 shrink-0 text-xl font-semibold tracking-tight text-white">
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
      </div>
    </motion.div>
  )
}
