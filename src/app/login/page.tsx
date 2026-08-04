import { LoginForm } from '@/components/LoginForm'

function debugEnvVar(name: string, value: string | undefined) {
  const hasNewlineOrTab = value ? /[\n\r\t]/.test(value) : false
  const hasLeadingTrailingSpace = value ? value !== value.trim() : false
  const hasAnyWhitespace = value ? /\s/.test(value) : false

  return `${name}
typeof: ${typeof value}
length: ${value?.length ?? 'n/a'}
first 20: ${value ? JSON.stringify(value.slice(0, 20)) : 'n/a'}
last 20: ${value ? JSON.stringify(value.slice(-20)) : 'n/a'}
has [\\n\\r\\t]: ${String(hasNewlineOrTab)}
has leading/trailing space: ${String(hasLeadingTrailingSpace)}
has any whitespace (\\s): ${String(hasAnyWhitespace)}
JSON: ${JSON.stringify(value)}`
}

export default function LoginPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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
startsWith https://: ${String(supabaseUrl?.startsWith('https://') ?? false)}

---

${debugEnvVar('DEBUG NEXT_PUBLIC_SUPABASE_ANON_KEY', supabaseAnonKey)}`}
        </pre>
      </div>
    </main>
  )
}
