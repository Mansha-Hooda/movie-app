import { IDENTIFY_REEL_PROMPT } from '@/lib/identify/reel-prompt'
import { emptyIdentifyResult, parseIdentifyJson } from '@/lib/identify/parse'
import type { IdentifyResult } from '@/lib/identify/types'
import { isGroqConfigured } from '@/lib/identify/groq'

const GROQ_MODEL = 'qwen/qwen3.6-27b'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

type GroqResponse = {
  choices?: { message?: { content?: string | null } }[]
  error?: { message?: string }
}

function getApiKey(): string | null {
  const key = process.env.GROQ_API_KEY?.trim()
  return key || null
}

function isRetryableGroqFailure(status: number, message: string): boolean {
  if (status === 429 || status === 500 || status === 502 || status === 503) {
    return true
  }
  return /overload|unavailable|timeout|temporar|rate.?limit|preview|capacity/i.test(
    message,
  )
}

async function callGroqTextOnce(
  key: string,
  combinedText: string,
): Promise<IdentifyResult> {
  const userMessage = `${IDENTIFY_REEL_PROMPT}\n\n---\nReel caption and transcript:\n${combinedText}`

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.2,
      max_completion_tokens: 512,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  let data: GroqResponse
  try {
    data = (await response.json()) as GroqResponse
  } catch {
    throw new Error(
      `Groq returned a non-JSON response (${response.status})`,
    )
  }

  if (!response.ok) {
    const message =
      data.error?.message || `Groq request failed (${response.status})`
    const error = new Error(message) as Error & {
      status?: number
      retryable?: boolean
    }
    error.status = response.status
    error.retryable = isRetryableGroqFailure(response.status, message)
    throw error
  }

  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) {
    const error = new Error('Groq returned an empty response') as Error & {
      retryable?: boolean
    }
    error.retryable = true
    throw error
  }

  try {
    return parseIdentifyJson(text)
  } catch {
    return emptyIdentifyResult()
  }
}

export async function identifyTextWithGroq(
  combinedText: string,
): Promise<IdentifyResult> {
  const key = getApiKey()
  if (!key) {
    throw new Error('GROQ_API_KEY is not configured')
  }

  try {
    return await callGroqTextOnce(key, combinedText)
  } catch (firstError) {
    const err = firstError as Error & { retryable?: boolean }
    if (!err.retryable) {
      throw firstError
    }
    await new Promise((resolve) => setTimeout(resolve, 600))
    return callGroqTextOnce(key, combinedText)
  }
}

export { isGroqConfigured }
