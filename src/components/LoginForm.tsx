'use client'

import { useState, type FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'

type LoginStep = 'email' | 'sent'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<LoginStep>('email')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setSubmitting(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    setStep('sent')
  }

  if (step === 'sent') {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <p className="mb-2 font-medium text-fg">Check your email</p>
        <p className="text-sm text-muted">
          We sent a sign-in link to <span className="font-medium text-fg">{email}</span>.
        </p>
        <button
          type="button"
          onClick={() => setStep('email')}
          className="mt-4 text-sm text-muted underline"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm text-muted">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-fg placeholder:text-muted"
        />
      </div>

      {error && (
        <p className="text-sm text-accent" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-accent px-4 py-2 text-ink disabled:opacity-60"
      >
        {submitting ? 'Sending…' : 'Send magic link'}
      </button>
    </form>
  )
}
