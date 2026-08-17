'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateTitleStatus } from '@/lib/titles/api'
import type { Title, TitleStatus } from '@/types/database'

const UNDO_MS = 5000

export type UndoWatched = {
  id: string
  previousStatus: TitleStatus
  name: string
}

/** Shared list state: keep done titles in memory for counts, with a short undo window. */
export function useBacklogTitles(initialTitles: Title[]) {
  const [titles, setTitles] = useState(initialTitles)
  const [undo, setUndo] = useState<UndoWatched | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (undoTimer.current) {
        clearTimeout(undoTimer.current)
      }
    }
  }, [])

  function clearUndoTimer() {
    if (undoTimer.current) {
      clearTimeout(undoTimer.current)
      undoTimer.current = null
    }
  }

  function handleTitleUpdate(updated: Title) {
    setTitles((current) => {
      const previous = current.find((title) => title.id === updated.id)

      if (updated.status === 'done' && previous && previous.status !== 'done') {
        clearUndoTimer()
        setUndo({
          id: updated.id,
          previousStatus: previous.status,
          name: updated.name,
        })
        undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS)
      }

      return current.map((title) => (title.id === updated.id ? updated : title))
    })
  }

  async function undoWatched() {
    if (!undo) {
      return
    }

    const { id, previousStatus } = undo
    clearUndoTimer()
    setUndo(null)

    setTitles((current) =>
      current.map((title) =>
        title.id === id ? { ...title, status: previousStatus } : title,
      ),
    )

    const supabase = createClient()
    const { error } = await updateTitleStatus(supabase, id, previousStatus)

    if (error) {
      setTitles((current) =>
        current.map((title) =>
          title.id === id ? { ...title, status: 'done' } : title,
        ),
      )
    }
  }

  function dismissUndo() {
    clearUndoTimer()
    setUndo(null)
  }

  const watchedCount = titles.filter((title) => title.status === 'done').length
  const totalCount = titles.length

  return {
    titles,
    handleTitleUpdate,
    undo,
    undoWatched,
    dismissUndo,
    watchedCount,
    totalCount,
  }
}
