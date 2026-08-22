'use client'

import type { MediaType } from '@/types/database'

export type MediaTypeTab = 'all' | MediaType

const TABS: { value: MediaType; label: string }[] = [
  { value: 'movie', label: 'Movies' },
  { value: 'show', label: 'TV shows' },
  { value: 'book', label: 'Books' },
]

type MediaTypeTabsProps = {
  value: MediaTypeTab
  onChange: (value: MediaTypeTab) => void
}

export function MediaTypeTabs({ value, onChange }: MediaTypeTabsProps) {
  return (
    <div
      className="flex rounded-2xl bg-surface p-1"
      role="tablist"
      aria-label="Media type"
    >
      {TABS.map((tab) => {
        const selected = value === tab.value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(selected ? 'all' : tab.value)}
            className={`flex-1 rounded-xl py-2.5 text-sm transition duration-150 ${
              selected ? 'bg-white font-medium text-ink' : 'text-muted'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
