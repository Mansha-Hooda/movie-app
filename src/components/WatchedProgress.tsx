type WatchedProgressProps = {
  watchedCount: number
  totalCount: number
}

export function WatchedProgress({ watchedCount, totalCount }: WatchedProgressProps) {
  return (
    <p className="mb-4 text-center text-xs text-muted" aria-live="polite">
      {watchedCount} / {totalCount} watched
    </p>
  )
}
