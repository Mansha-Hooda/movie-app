import { identifyWithGemini } from '@/lib/identify/gemini'
import { identifyTextWithGeminiRetrying } from '@/lib/identify/gemini-text'
import { identifyWithGroq, isGroqConfigured } from '@/lib/identify/groq'
import { identifyTextWithGroq } from '@/lib/identify/groq-text'
import type { IdentifyResult } from '@/lib/identify/types'

export type { IdentifyResult }

function isValidResult(results: IdentifyResult[]): boolean {
  return results.some((result) => Boolean(result.name?.trim() && result.media_type))
}

type ProviderAttempt = {
  source: string
  result?: IdentifyResult[]
  error?: string
}

/**
 * Race provider promises; first response with at least one named title wins.
 * Failures / empty parses do not reject early — wait for remaining providers.
 */
async function raceFirstValid(
  providers: { source: string; run: () => Promise<IdentifyResult[]> }[],
): Promise<IdentifyResult[]> {
  if (providers.length === 0) {
    throw new Error('No identification providers configured')
  }

  if (providers.length === 1) {
    return providers[0].run()
  }

  return new Promise<IdentifyResult[]>((resolve, reject) => {
    let settled = false
    let pending = providers.length
    const attempts: ProviderAttempt[] = []

    function finishIfDone() {
      if (settled || pending > 0) return

      const softMiss = attempts.find((a) => a.result && !isValidResult(a.result))
      if (softMiss?.result) {
        resolve(softMiss.result)
        return
      }

      const empty = attempts.find((a) => a.result)
      if (empty?.result) {
        resolve(empty.result)
        return
      }

      const details = attempts
        .map((a) => a.error || `${a.source}: no result`)
        .join('; ')
      reject(new Error(`Identification failed (${details})`))
    }

    for (const provider of providers) {
      void provider
        .run()
        .then((result) => {
          if (settled) return

          attempts.push({ source: provider.source, result })

          if (isValidResult(result)) {
            settled = true
            console.info(`[identify] Using ${provider.source} (first valid)`)
            resolve(result)
            return
          }

          pending -= 1
          finishIfDone()
        })
        .catch((error: unknown) => {
          if (settled) return

          const message =
            error instanceof Error ? error.message : `${provider.source} failed`
          console.warn(`[identify] ${provider.source} error:`, message)
          attempts.push({ source: provider.source, error: message })
          pending -= 1
          finishIfDone()
        })
    }
  })
}

/**
 * Identify titles from a screenshot.
 * Fires Gemini and Groq (when configured) in parallel; first valid result wins.
 */
export async function identifyScreenshot(
  imageBase64: string,
  mimeType: string,
): Promise<IdentifyResult[]> {
  const providers: { source: string; run: () => Promise<IdentifyResult[]> }[] = [
    {
      source: 'gemini',
      run: () => identifyWithGemini(imageBase64, mimeType),
    },
  ]

  if (isGroqConfigured()) {
    providers.push({
      source: 'groq',
      run: () => identifyWithGroq(imageBase64, mimeType),
    })
  }

  return raceFirstValid(providers)
}

/**
 * Identify titles from reel caption + transcript text.
 * Fires Gemini and Groq (when configured) in parallel; first valid result wins.
 */
export async function identifyFromText(combinedText: string): Promise<IdentifyResult[]> {
  const text = combinedText.trim()
  if (!text) {
    return []
  }

  const providers: { source: string; run: () => Promise<IdentifyResult[]> }[] = [
    {
      source: 'gemini',
      run: () => identifyTextWithGeminiRetrying(text),
    },
  ]

  if (isGroqConfigured()) {
    providers.push({
      source: 'groq',
      run: () => identifyTextWithGroq(text),
    })
  }

  return raceFirstValid(providers)
}
