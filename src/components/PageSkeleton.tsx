export function PageSkeleton({
  heading,
  showHeader = true,
}: {
  heading?: string
  showHeader?: boolean
}) {
  return (
    <div>
      {showHeader ? (
        <div className="mb-6 flex items-center justify-between">
          <div className="h-8 w-28 animate-pulse rounded-lg bg-surface" />
          <div className="h-9 w-9 animate-pulse rounded-xl bg-surface" />
        </div>
      ) : null}
      {heading ? (
        <div className="mb-6 h-7 w-40 animate-pulse rounded-lg bg-surface" />
      ) : (
        <>
          <div className="mb-4 h-10 w-48 mx-auto animate-pulse rounded-lg bg-surface" />
          <div className="mb-8 h-12 w-full animate-pulse rounded-2xl bg-surface" />
        </>
      )}
      <div className="grid grid-cols-2 gap-x-3 gap-y-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="aspect-[2/3] animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  )
}
