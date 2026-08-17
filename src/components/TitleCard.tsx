'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateTitleStatus } from '@/lib/titles/api'
import { TITLE_STATUSES } from '@/lib/titles/constants'
import type { Title, TitleStatus } from '@/types/database'

type TitleCardProps = {
  title: Title
  onUpdate?: (title: Title) => void
}

export function TitleCard({ title: initialTitle, onUpdate }: TitleCardProps) {
  const [title, setTitle] = useState(initialTitle)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  function commitUpdate(next: Title) {
    setTitle(next)
    onUpdate?.(next)
  }

  async function handleStatusChange(status: TitleStatus) {
    const previous = title
    setError(null)
    setUpdating(true)
    commitUpdate({ ...title, status })

    const supabase = createClient()
    const { error: updateError } = await updateTitleStatus(supabase, title.id, status)

    setUpdating(false)

    if (updateError) {
      commitUpdate(previous)
      setError(updateError.message)
    }
  }

  return (
    <article className="rounded-lg border border-gray-200 p-4">
      <div className="mb-3 overflow-hidden rounded bg-gray-100">
        {title.poster_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={title.poster_url}
            alt=""
            className="aspect-[2/3] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[2/3] w-full items-center justify-center text-sm text-gray-400">
            No poster
          </div>
        )}
      </div>

      <div className="mb-2 flex items-start justify-between gap-2">
        <h2 className="font-medium text-gray-900">{title.name}</h2>
        <span className="shrink-0 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
          {title.media_type}
        </span>
      </div>

      {title.genre && (
        <p className="mb-2 text-sm text-gray-600">{title.genre}</p>
      )}

      {title.mood_tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {title.mood_tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-gray-200 px-2 py-0.5 text-xs text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <p className="mb-2 text-sm text-gray-600">Time: {title.time_commitment}</p>

      {title.suggested_by && (
        <p className="mb-2 text-sm text-gray-600">Suggested by {title.suggested_by}</p>
      )}

      <div className="mb-2">
        <label htmlFor={`status-${title.id}`} className="mb-1 block text-xs text-gray-500">
          Status
        </label>
        <select
          id={`status-${title.id}`}
          value={title.status}
          disabled={updating}
          onChange={(event) => handleStatusChange(event.target.value as TitleStatus)}
          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 disabled:opacity-60"
        >
          {TITLE_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </article>
  )
}
