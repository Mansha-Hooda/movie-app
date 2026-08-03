import { LoginForm } from '@/components/LoginForm'

export default function LoginPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center text-2xl font-semibold">Backlog</h1>
        <p className="mb-8 text-center text-sm text-gray-600">
          Save recommendations. Pick the right one when you&apos;re ready.
        </p>
        <LoginForm />
      </div>
    </main>
  )
}
