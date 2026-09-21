'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type LoginStep = 'email' | 'code'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [step, setStep] = useState<LoginStep>('email')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)

  async function sendCode(address: string) {
    const supabase = createClient()
    return supabase.auth.signInWithOtp({ email: address })
  }

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const address = email.trim()
    const { error: signInError } = await sendCode(address)

    setSubmitting(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    setToken('')
    setStep('code')
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    const supabase = createClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'email',
    })

    setSubmitting(false)

    if (verifyError) {
      setError(verifyError.message || 'That code is wrong or expired. Try again.')
      return
    }

    router.push('/')
    router.refresh()
  }

  async function handleResend() {
    setError(null)
    setResending(true)
    const { error: signInError } = await sendCode(email.trim())
    setResending(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    setToken('')
  }

  function handleChangeEmail() {
    setError(null)
    setToken('')
    setStep('email')
  }

  if (step === 'code') {
    return (
      <form onSubmit={handleVerify} className="space-y-4">
        <div className="text-center">
          <p className="mb-1 font-medium text-fg">Enter the code</p>
          <p className="text-sm text-muted">
            We sent a 6-digit code to <span className="font-medium text-fg">{email}</span>.
          </p>
        </div>

        <div>
          <label htmlFor="otp" className="mb-1 block text-sm text-muted">
            Code
          </label>
          <input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            autoFocus
            value={token}
            onChange={(event) => setToken(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="field text-center text-2xl tracking-[0.4em]"
          />
        </div>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || token.length !== 6}
          className="btn-primary w-full"
        >
          {submitting ? 'Verifying…' : 'Verify'}
        </button>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => void handleResend()}
            disabled={resending || submitting}
            className="text-sm text-white transition-colors hover:brightness-110 disabled:opacity-60"
          >
            {resending ? 'Sending…' : 'Resend code'}
          </button>
          <button
            type="button"
            onClick={handleChangeEmail}
            className="text-sm text-muted transition-colors hover:text-white"
          >
            Use a different email
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSendCode} className="space-y-4">
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
          className="field"
        />
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Sending…' : 'Send code'}
      </button>
    </form>
  )
}
