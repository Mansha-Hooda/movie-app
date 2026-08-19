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
      className="fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg"
      role="status"
    >
      <p className="text-sm text-fg">Marked as watched. Undo?</p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onUndo}
          className="rounded-full bg-accent px-3 py-1 text-sm text-ink transition duration-150 hover:brightness-110 active:scale-95"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-sm text-muted"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}
