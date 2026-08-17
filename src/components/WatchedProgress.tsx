type WatchedProgressProps = {
  watchedCount: number
  totalCount: number
}

export function WatchedProgress({ watchedCount, totalCount }: WatchedProgressProps) {
  return (
    <p className="text-sm text-gray-600" aria-live="polite">
      {watchedCount} / {totalCount} watched
    </p>
  )
}
