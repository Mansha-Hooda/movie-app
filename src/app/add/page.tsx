import Link from 'next/link'
import { redirect } from 'next/navigation'
import { TitleForm } from '@/components/TitleForm'
import { createClient } from '@/lib/supabase/server'

export default async function AddPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Add title</h1>
        <Link href="/" className="text-sm text-gray-700 underline">
          Back
        </Link>
      </div>
      <TitleForm userId={user.id} />
    </main>
  )
}
