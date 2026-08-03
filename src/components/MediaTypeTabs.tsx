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
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Media type">
      {TABS.map((tab) => {
        const selected = value === tab.value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              selected
                ? 'border-gray-900 bg-gray-900 text-white'
                : 'border-gray-300 text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
