'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { moodLabel } from '@/lib/titles/moods'

type MoodCarouselProps = {
  moods: string[]
  value: string
  onChange: (mood: string) => void
}

export function MoodCarousel({ moods, value, onChange }: MoodCarouselProps) {
  const index = Math.max(0, moods.indexOf(value))
  const [slide, setSlide] = useState<'idle' | 'out-left' | 'out-right' | 'in'>('idle')

  function cycle(delta: 1 | -1) {
    if (moods.length === 0) return
    const nextIndex = (index + delta + moods.length) % moods.length
    setSlide(delta > 0 ? 'out-left' : 'out-right')
    window.setTimeout(() => {
      onChange(moods[nextIndex])
      setSlide('in')
      window.setTimeout(() => setSlide('idle'), 180)
    }, 140)
  }

  const motionClass =
    slide === 'out-left'
      ? '-translate-x-4 opacity-0'
      : slide === 'out-right'
        ? 'translate-x-4 opacity-0'
        : 'translate-x-0 opacity-100'

  return (
    <div className="text-center">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
        mood
      </p>
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => cycle(-1)}
          className="rounded-full p-2 text-muted transition-colors hover:text-fg active:scale-95"
          aria-label="Previous mood"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2
          className={`min-w-0 flex-1 text-2xl font-medium tracking-tight text-fg transition-all duration-150 ease-out sm:text-3xl ${motionClass}`}
        >
          {moodLabel(value)}
        </h2>
        <button
          type="button"
          onClick={() => cycle(1)}
          className="rounded-full p-2 text-muted transition-colors hover:text-fg active:scale-95"
          aria-label="Next mood"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
      <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden>
        {moods.map((tag, i) => (
          <span
            key={tag}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              i === index ? 'w-5 bg-accent' : 'w-1.5 bg-border'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
