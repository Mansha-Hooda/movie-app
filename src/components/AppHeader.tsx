'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { CircleUser } from 'lucide-react'
import { BottomSheet } from '@/components/BottomSheet'
import { createClient } from '@/lib/supabase/client'

type AppHeaderProps = {
  email: string
}

export function AppHeader({ email }: AppHeaderProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const titleId = useId()

  async function handleLogout() {
    setOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header data-app-header className="relative mb-6 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2.5 text-lg font-medium tracking-tight text-fg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="" className="h-8 w-8 rounded-[0.55rem]" />
        Backlog
      </Link>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface text-white transition-colors duration-200 hover:brightness-110 active:scale-95 [&_svg]:text-white"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <CircleUser className="h-5 w-5" strokeWidth={1.75} />
      </button>

      <AnimatePresence>
        {open ? (
          <BottomSheet key="account-sheet" labelledBy={titleId} onClose={() => setOpen(false)}>
            <h2 id={titleId} className="sr-only">
              Account
            </h2>

            <p className="cursor-default select-text py-2 text-sm text-muted">
              {email || 'Signed in'}
            </p>

            <div className="my-2" />

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
          </BottomSheet>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
