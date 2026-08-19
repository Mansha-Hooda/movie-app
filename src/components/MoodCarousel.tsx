'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MOOD_DISPLAY_LABELS, MOOD_TAGS, type MoodTag } from '@/lib/titles/constants'

type MoodCarouselProps = {
  value: MoodTag
  onChange: (mood: MoodTag) => void
}

export function MoodCarousel({ value, onChange }: MoodCarouselProps) {
  const index = MOOD_TAGS.indexOf(value)
  const [slide, setSlide] = useState<'idle' | 'out-left' | 'out-right' | 'in'>('idle')

  function cycle(delta: 1 | -1) {
    const nextIndex = (index + delta + MOOD_TAGS.length) % MOOD_TAGS.length
    setSlide(delta > 0 ? 'out-left' : 'out-right')
    window.setTimeout(() => {
      onChange(MOOD_TAGS[nextIndex])
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
    <div className="mb-6 text-center">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-accent">
        mood
      </p>
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => cycle(-1)}
          className="rounded-full p-2 text-muted transition-colors hover:text-fg"
          aria-label="Previous mood"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2
          className={`min-w-0 flex-1 text-2xl font-medium tracking-tight text-fg transition-all duration-150 ease-out sm:text-3xl ${motionClass}`}
        >
          {MOOD_DISPLAY_LABELS[value]}
        </h2>
        <button
          type="button"
          onClick={() => cycle(1)}
          className="rounded-full p-2 text-muted transition-colors hover:text-fg"
          aria-label="Next mood"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
      <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden>
        {MOOD_TAGS.map((tag, i) => (
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
