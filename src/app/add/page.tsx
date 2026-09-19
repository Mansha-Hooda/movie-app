import { redirect } from 'next/navigation'
import { CloseToHome } from '@/components/CloseToHome'
import { TitleForm } from '@/components/TitleForm'
import { fetchUserTitles } from '@/lib/titles/api'
import { getSessionUser } from '@/lib/supabase/session'
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
  const { user } = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = await createClient()
  const params = await searchParams
  const initialName = params.name?.trim() || undefined
  const initialMediaType = parseMediaType(params.media_type)
  const { data: titles } = await fetchUserTitles(supabase, user.id)

  return (
    <main className="mx-auto max-w-md px-5 pb-12 pt-4">
      <header className="relative mb-8 flex items-center justify-center">
        <CloseToHome />
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
