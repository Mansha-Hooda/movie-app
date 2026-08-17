'use client'

import type { UndoWatched } from '@/hooks/useBacklogTitles'

type UndoWatchedToastProps = {
  undo: UndoWatched | null
  onUndo: () => void
  onDismiss: () => void
}

export function UndoWatchedToast({ undo, onUndo, onDismiss }: UndoWatchedToastProps) {
  if (!undo) {
    return null
  }

  return (
    <div
      className="fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg"
      role="status"
    >
      <p className="text-sm text-gray-800">Marked as watched. Undo?</p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onUndo}
          className="rounded-md bg-gray-900 px-3 py-1 text-sm text-white"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-sm text-gray-500"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}
