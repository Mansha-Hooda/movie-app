import { LoginForm } from '@/components/LoginForm'

export default function LoginPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-2xl font-semibold">Backlog</h1>
        <p className="mb-8 text-center text-sm text-gray-600">
          Save recommendations. Pick the right one when you&apos;re ready.
        </p>
        <LoginForm />

        {/* TEMP DEBUG — remove after Vercel env investigation */}
        <pre className="mt-8 overflow-x-auto rounded border border-amber-300 bg-amber-50 p-3 text-left text-[10px] leading-relaxed text-amber-950">
          {`DEBUG NEXT_PUBLIC_SUPABASE_URL
typeof: ${typeof supabaseUrl}
value: ${supabaseUrl ?? '(undefined)'}
JSON: ${JSON.stringify(supabaseUrl)}
length: ${supabaseUrl?.length ?? 'n/a'}
startsWith https://: ${String(supabaseUrl?.startsWith('https://') ?? false)}`}
        </pre>
      </div>
    </main>
  )
}
