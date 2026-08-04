import { identifyWithGeminiRetrying } from '@/lib/identify/gemini'
import { identifyWithGroq, isGroqConfigured } from '@/lib/identify/groq'
import type { IdentifyResult } from '@/lib/identify/types'

export type { IdentifyResult }

/**
 * Identify a title from a screenshot.
 * Tries Gemini (with one retry on overload), then falls back to Groq vision.
 */
export async function identifyScreenshot(
  imageBase64: string,
  mimeType: string,
): Promise<IdentifyResult> {
  try {
    return await identifyWithGeminiRetrying(imageBase64, mimeType)
  } catch (geminiError) {
    const geminiMessage =
      geminiError instanceof Error ? geminiError.message : 'Gemini identification failed'

    if (!isGroqConfigured()) {
      throw geminiError instanceof Error
        ? geminiError
        : new Error(geminiMessage)
    }

    console.warn('[identify] Gemini failed after retry, falling back to Groq:', geminiMessage)

    try {
      return await identifyWithGroq(imageBase64, mimeType)
    } catch (groqError) {
      const groqMessage =
        groqError instanceof Error ? groqError.message : 'Groq identification failed'
      console.error('[identify] Groq fallback also failed:', groqMessage)
      throw new Error(
        `Identification failed (Gemini: ${geminiMessage}; Groq: ${groqMessage})`,
      )
    }
  }
}
