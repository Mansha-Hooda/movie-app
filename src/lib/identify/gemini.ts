import { IDENTIFY_PROMPT } from '@/lib/identify/prompt'
import { emptyIdentifyResult, parseIdentifyJson } from '@/lib/identify/parse'
import type { IdentifyResult } from '@/lib/identify/types'

const GEMINI_MODEL = 'gemini-3.5-flash-lite'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

type GeminiResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[]
    }
  }[]
  error?: { message?: string }
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) {
    throw new Error('GEMINI_API_KEY is not configured')
  }
  return key
}

export function isRetryableGeminiError(message: string, status?: number): boolean {
  if (status === 429 || status === 503 || status === 500) return true
  return /overload|unavailable|resource.?exhausted|try again|high demand|timeout|temporar/i.test(
    message,
  )
}

/** Single Gemini vision attempt. */
export async function identifyWithGemini(
  imageBase64: string,
  mimeType: string,
): Promise<IdentifyResult> {
  const key = getApiKey()

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key,
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: IDENTIFY_PROMPT },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        thinkingConfig: {
          thinkingLevel: 'minimal',
        },
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            media_type: {
              type: 'STRING',
              enum: ['movie', 'show', 'book'],
            },
            confidence: { type: 'NUMBER' },
          },
          required: ['name', 'media_type', 'confidence'],
        },
      },
    }),
  })

  const data = (await response.json()) as GeminiResponse

  if (!response.ok) {
    const message = data.error?.message || `Gemini request failed (${response.status})`
    const error = new Error(message) as Error & { status?: number; retryable?: boolean }
    error.status = response.status
    error.retryable = isRetryableGeminiError(message, response.status)
    throw error
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim()

  if (!text) {
    return emptyIdentifyResult()
  }

  try {
    return parseIdentifyJson(text)
  } catch {
    return emptyIdentifyResult()
  }
}

/** Gemini with one retry on overload/transient failures. */
export async function identifyWithGeminiRetrying(
  imageBase64: string,
  mimeType: string,
): Promise<IdentifyResult> {
  try {
    return await identifyWithGemini(imageBase64, mimeType)
  } catch (firstError) {
    const err = firstError as Error & { retryable?: boolean }
    if (!err.retryable) {
      throw firstError
    }

    console.warn('[identify] Gemini failed, retrying once:', err.message)
    await new Promise((resolve) => setTimeout(resolve, 800))
    return identifyWithGemini(imageBase64, mimeType)
  }
}
