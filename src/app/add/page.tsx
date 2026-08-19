import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/AppHeader'
import { TitleForm } from '@/components/TitleForm'
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

  return (
    <main className="mx-auto max-w-md px-5 pb-12 pt-6">
      <AppHeader email={user.email ?? ''} />
      <h1 className="mb-6 text-xl font-medium text-fg">Add title</h1>
      <TitleForm
        userId={user.id}
        initialName={initialName}
        initialMediaType={initialMediaType}
        autoEnrich={Boolean(initialName)}
      />
    </main>
  )
}
