import { IDENTIFY_PROMPT } from '@/lib/identify/prompt'
import { emptyIdentifyResult, parseIdentifyJson } from '@/lib/identify/parse'
import type { IdentifyResult } from '@/lib/identify/types'

const GROQ_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

type GroqResponse = {
  choices?: { message?: { content?: string | null } }[]
  error?: { message?: string }
}

function getApiKey(): string | null {
  const key = process.env.GROQ_API_KEY?.trim()
  return key || null
}

export function isGroqConfigured(): boolean {
  return Boolean(getApiKey())
}

/** Identify a screenshot via Groq Llama 4 Scout vision. */
export async function identifyWithGroq(
  imageBase64: string,
  mimeType: string,
): Promise<IdentifyResult> {
  const key = getApiKey()
  if (!key) {
    throw new Error('GROQ_API_KEY is not configured')
  }

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

  const data = (await response.json()) as GroqResponse

  if (!response.ok) {
    throw new Error(data.error?.message || `Groq request failed (${response.status})`)
  }

  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) {
    return emptyIdentifyResult()
  }

  try {
    return parseIdentifyJson(text)
  } catch {
    return emptyIdentifyResult()
  }
}
