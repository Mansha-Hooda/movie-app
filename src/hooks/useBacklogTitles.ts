'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { deleteTitle, restoreTitle, updateTitleStatus } from '@/lib/titles/api'
import type { Title, TitleStatus } from '@/types/database'

const UNDO_MS = 5000

export type UndoAction =
  | {
      kind: 'watched'
      id: string
      previousStatus: TitleStatus
      name: string
      mediaType: Title['media_type']
    }
  | {
      kind: 'delete'
      title: Title
    }

/** Shared list state: keep done titles in memory for counts, with a short undo window. */
export function useBacklogTitles(initialTitles: Title[]) {
  const [titles, setTitles] = useState(initialTitles)
  const [undo, setUndo] = useState<UndoAction | null>(null)
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

  function showUndo(next: UndoAction) {
    clearUndoTimer()
    setUndo(next)
    undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS)
  }

  function handleTitleUpdate(updated: Title) {
    const previous = titles.find((title) => title.id === updated.id)

    if (updated.status === 'done' && previous && previous.status !== 'done') {
      showUndo({
        kind: 'watched',
        id: updated.id,
        previousStatus: previous.status,
        name: updated.name,
        mediaType: updated.media_type,
      })
    }

    setTitles((current) =>
      current.map((title) => (title.id === updated.id ? updated : title)),
    )
  }

  async function handleTitleDelete(title: Title) {
    showUndo({ kind: 'delete', title })
    setTitles((current) => current.filter((item) => item.id !== title.id))

    const supabase = createClient()
    const { error } = await deleteTitle(supabase, title.id)

    if (error) {
      clearUndoTimer()
      setUndo(null)
      setTitles((current) => {
        if (current.some((item) => item.id === title.id)) return current
        return [title, ...current]
      })
    }
  }

  async function undoAction() {
    if (!undo) return

    const action = undo
    clearUndoTimer()
    setUndo(null)

    const supabase = createClient()

    if (action.kind === 'watched') {
      const { id, previousStatus } = action
      setTitles((current) =>
        current.map((title) =>
          title.id === id ? { ...title, status: previousStatus } : title,
        ),
      )

      const { error } = await updateTitleStatus(supabase, id, previousStatus)
      if (error) {
        setTitles((current) =>
          current.map((title) =>
            title.id === id ? { ...title, status: 'done' } : title,
          ),
        )
      }
      return
    }

    const { title } = action
    setTitles((current) => {
      if (current.some((item) => item.id === title.id)) return current
      return [title, ...current]
    })

    const { error } = await restoreTitle(supabase, title)
    if (error) {
      setTitles((current) => current.filter((item) => item.id !== title.id))
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
    handleTitleDelete,
    undo,
    undoAction,
    dismissUndo,
    watchedCount,
    totalCount,
  }
}
