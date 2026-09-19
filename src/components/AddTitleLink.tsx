import Link from 'next/link'

type AddTitleLinkProps = {
  variant?: 'fab' | 'link'
}

export function AddTitleLink({ variant = 'fab' }: AddTitleLinkProps) {
  if (variant === 'link') {
    return (
      <Link href="/add" className="text-xs text-muted transition-colors hover:text-accent">
        Add
      </Link>
    )
  }

  return (
    <Link
      href="/add"
      className="fixed bottom-6 right-6 z-20 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent text-4xl font-medium leading-none text-white shadow-md transition duration-150 hover:brightness-110 active:scale-95"
      data-add-fab
      aria-label="Add title"
    >
      +
    </Link>
  )
}
