type ItemCountProps = {
  count: number
}

export function ItemCount({ count }: ItemCountProps) {
  return (
    <p className="mb-6 mt-4 text-center text-xs text-muted" aria-live="polite">
      {count} {count === 1 ? 'item' : 'items'}
    </p>
  )
}
