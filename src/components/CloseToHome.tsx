'use client'

import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'

export function CloseToHome() {
  const router = useRouter()

  return (
    <button
      type="button"
      aria-label="Close"
      className="absolute left-0 flex h-10 w-10 items-center justify-center text-fg"
      onClick={() => router.push('/')}
    >
      <X className="h-6 w-6" strokeWidth={1.75} />
    </button>
  )
}
