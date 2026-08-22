'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CircleUser } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type AppHeaderProps = {
  email: string
}

export function AppHeader({ email }: AppHeaderProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const titleId = useId()

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function handleLogout() {
    setOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="relative mb-6 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2.5 text-lg font-medium tracking-tight text-fg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="" className="h-8 w-8 rounded-[0.55rem]" />
        Backlog
      </Link>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors duration-200 hover:border-accent hover:text-accent active:scale-95"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <CircleUser className="h-5 w-5" strokeWidth={1.75} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close account menu"
            className="absolute inset-0 bg-page/70"
            onClick={() => setOpen(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-2xl border border-b-0 border-border bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-lg"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
            <h2 id={titleId} className="sr-only">
              Account
            </h2>

            <p className="cursor-default select-text py-2 text-sm text-muted">
              {email || 'Signed in'}
            </p>

            <div className="my-2 border-t border-border" />

            <Link
              href="/history"
              onClick={() => setOpen(false)}
              className="block py-3 text-base text-fg transition-colors duration-150 hover:text-accent"
            >
              History
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full py-3 text-left text-base text-danger transition-colors duration-150"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
