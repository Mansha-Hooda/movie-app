import { redirect } from 'next/navigation'
import Link from 'next/link'
import { X } from 'lucide-react'
import { TitleForm } from '@/components/TitleForm'
import { fetchUserTitles } from '@/lib/titles/api'
import { createClient } from '@/lib/supabase/server'
import type { MediaType } from '@/types/database'

type AddPageProps = {
  searchParams: Promise<{
    name?: string
    media_type?: string
  }>
}

function parseMediaType(value: string | undefined): MediaType | undefined {
  if (value === 'movie' || value === 'show' || value === 'book') {
    return value
  }
  return undefined
}

export default async function AddPage({ searchParams }: AddPageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const params = await searchParams
  const initialName = params.name?.trim() || undefined
  const initialMediaType = parseMediaType(params.media_type)
  const { data: titles } = await fetchUserTitles(supabase, user.id)

  return (
    <main className="mx-auto max-w-md px-5 pb-12 pt-4">
      <header className="relative mb-8 flex items-center justify-center">
        <Link
          href="/"
          aria-label="Close"
          className="absolute left-0 flex h-10 w-10 items-center justify-center text-fg"
        >
          <X className="h-6 w-6" strokeWidth={1.75} />
        </Link>
        <h1 className="text-lg font-semibold text-fg">Add title</h1>
      </header>
      <TitleForm
        userId={user.id}
        initialName={initialName}
        initialMediaType={initialMediaType}
        existingTitles={titles ?? []}
        autoEnrich={Boolean(initialName)}
      />
    </main>
  )
}
