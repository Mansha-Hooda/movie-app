'use client'

import type { MediaType } from '@/types/database'

export type MediaTypeTab = 'all' | MediaType

const TABS: { value: MediaTypeTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'show', label: 'Shows' },
  { value: 'book', label: 'Books' },
]

type MediaTypeTabsProps = {
  value: MediaTypeTab
  onChange: (value: MediaTypeTab) => void
}

export function MediaTypeTabs({ value, onChange }: MediaTypeTabsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2" role="tablist" aria-label="Media type">
      {TABS.map((tab) => {
        const selected = value === tab.value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors duration-200 ${
              selected
                ? 'border-accent bg-accent text-ink'
                : 'border-border bg-transparent text-muted'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
