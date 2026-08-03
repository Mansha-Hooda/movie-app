import Link from 'next/link'
import { redirect } from 'next/navigation'
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
    <main className="mx-auto max-w-md px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Add title</h1>
        <Link href="/" className="text-sm text-gray-700 underline">
          Back
        </Link>
      </div>
      <TitleForm
        userId={user.id}
        initialName={initialName}
        initialMediaType={initialMediaType}
        autoEnrich={Boolean(initialName)}
      />
    </main>
  )
}
