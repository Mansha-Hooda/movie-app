import { LoginForm } from '@/components/LoginForm'

export default function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon.png"
          alt=""
          className="mx-auto mb-4 h-16 w-16 rounded-2xl"
        />
        <h1 className="mb-2 text-center text-2xl font-medium text-fg">Backlog</h1>
        <p className="mb-8 text-center text-sm text-muted">
          Save recommendations. Pick the right one when you&apos;re ready.
        </p>
        <LoginForm />
      </div>
    </main>
  )
}
