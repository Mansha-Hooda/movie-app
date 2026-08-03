import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AddTitleLink } from '@/components/AddTitleLink'
import { BacklogGrid } from '@/components/BacklogGrid'
import { LogoutButton } from '@/components/LogoutButton'
import { fetchUserTitles } from '@/lib/titles/api'
import { createClient } from '@/lib/supabase/server'

export default async function BacklogPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: titles, error } = await fetchUserTitles(supabase, user.id)

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-red-600" role="alert">
          Failed to load titles: {error.message}
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Backlog</h1>
          <p className="text-sm text-gray-600">{user.email}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-700 underline">
            What fits now
          </Link>
          <AddTitleLink variant="link" />
          <LogoutButton />
        </div>
      </header>

      <BacklogGrid titles={titles ?? []} />
      <AddTitleLink />
    </main>
  )
}
