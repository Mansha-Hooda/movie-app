import type { IdentifyResult } from '@/lib/gemini/types'

export type { IdentifyResult }

const GEMINI_MODEL = 'gemini-3.5-flash-lite'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const PROMPT = `You are identifying a movie, TV show, or book from a screenshot.
The image may be a text message, Google search, IMDb/Letterboxd page, Amazon listing, notification, or similar.

Return JSON only matching this schema:
{
  "name": string | null,
  "media_type": "movie" | "show" | "book" | null,
  "confidence": number
}

Rules:
- name: the canonical title only (no year, no "watch", no extra words)
- media_type: movie, show (TV series), or book
- confidence: 0 to 1 how sure you are this is the correct title and type
- If you cannot identify a clear title, set name and media_type to null and confidence to 0
- Prefer the most prominent title in the screenshot when multiple appear`

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

function parseIdentifyJson(text: string): IdentifyResult {
  const trimmed = text.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  const raw = jsonMatch ? jsonMatch[0] : trimmed
  const parsed = JSON.parse(raw) as {
    name?: unknown
    media_type?: unknown
    confidence?: unknown
  }

  const mediaType =
    parsed.media_type === 'movie' ||
    parsed.media_type === 'show' ||
    parsed.media_type === 'book'
      ? parsed.media_type
      : null

  const name =
    typeof parsed.name === 'string' && parsed.name.trim()
      ? parsed.name.trim()
      : null

  let confidence = 0
  if (typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)) {
    confidence = Math.max(0, Math.min(1, parsed.confidence))
  }

  return { name, media_type: mediaType, confidence }
}

/**
 * Send a screenshot to Gemini vision and parse a structured title guess.
 */
export async function identifyScreenshot(
  imageBase64: string,
  mimeType: string,
): Promise<IdentifyResult> {
  const key = getApiKey()

  // Prefer header auth (query ?key= also works; both sent for compatibility)
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
            { text: PROMPT },
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
        // Gemini 3.x: use thinkingLevel instead of temperature/top_p/top_k
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
    throw new Error(data.error?.message || `Gemini request failed (${response.status})`)
  }

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim()

  if (!text) {
    return { name: null, media_type: null, confidence: 0 }
  }

  try {
    return parseIdentifyJson(text)
  } catch {
    return { name: null, media_type: null, confidence: 0 }
  }
}
