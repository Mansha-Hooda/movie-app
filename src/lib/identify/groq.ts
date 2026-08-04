import { IDENTIFY_PROMPT } from '@/lib/identify/prompt'
import { emptyIdentifyResult, parseIdentifyJson } from '@/lib/identify/parse'
import type { IdentifyResult } from '@/lib/identify/types'

/** Groq preview multimodal model (vision via OpenAI-compatible image_url blocks). */
const GROQ_MODEL = 'qwen/qwen3.6-27b'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

type GroqResponse = {
  choices?: { message?: { content?: string | null } }[]
  error?: { message?: string; code?: string; type?: string }
}

function getApiKey(): string | null {
  const key = process.env.GROQ_API_KEY?.trim()
  return key || null
}

export function isGroqConfigured(): boolean {
  return Boolean(getApiKey())
}

function isRetryableGroqFailure(status: number, message: string): boolean {
  if (status === 429 || status === 500 || status === 502 || status === 503) {
    return true
  }
  return /overload|unavailable|timeout|temporar|rate.?limit|preview|capacity/i.test(
    message,
  )
}

async function callGroqOnce(
  key: string,
  imageBase64: string,
  mimeType: string,
): Promise<IdentifyResult> {
  // OpenAI-compatible vision: text + image_url (data URL) content blocks
  const dataUrl = `data:${mimeType};base64,${imageBase64}`

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
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: IDENTIFY_PROMPT },
            {
              type: 'image_url',
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
    }),
  })

  let data: GroqResponse
  try {
    data = (await response.json()) as GroqResponse
  } catch {
    throw new Error(
      `Groq preview model returned a non-JSON response (${response.status})`,
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
    // Preview models sometimes return empty content under load
    const error = new Error(
      'Groq preview model returned an empty response',
    ) as Error & { retryable?: boolean }
    error.retryable = true
    throw error
  }

  try {
    return parseIdentifyJson(text)
  } catch {
    console.warn('[identify/groq] Failed to parse JSON from preview model')
    return emptyIdentifyResult()
  }
}

/**
 * Identify a screenshot via Groq Qwen3.6-27B vision (preview).
 * Retries once on transient/preview instability before failing.
 */
export async function identifyWithGroq(
  imageBase64: string,
  mimeType: string,
): Promise<IdentifyResult> {
  const key = getApiKey()
  if (!key) {
    throw new Error('GROQ_API_KEY is not configured')
  }

  try {
    return await callGroqOnce(key, imageBase64, mimeType)
  } catch (firstError) {
    const err = firstError as Error & { retryable?: boolean }
    if (!err.retryable) {
      throw firstError
    }

    console.warn(
      '[identify/groq] Preview model unstable, retrying once:',
      err.message,
    )
    await new Promise((resolve) => setTimeout(resolve, 600))

    try {
      return await callGroqOnce(key, imageBase64, mimeType)
    } catch (secondError) {
      const message =
        secondError instanceof Error
          ? secondError.message
          : 'Groq identification failed'
      throw new Error(
        `Groq preview model (${GROQ_MODEL}) failed after retry: ${message}`,
      )
    }
  }
}
