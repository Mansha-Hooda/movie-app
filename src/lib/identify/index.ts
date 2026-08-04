import { identifyWithGemini } from '@/lib/identify/gemini'
import { identifyWithGroq, isGroqConfigured } from '@/lib/identify/groq'
import type { IdentifyResult } from '@/lib/identify/types'

export type { IdentifyResult }

function isValidResult(result: IdentifyResult): boolean {
  return Boolean(result.name?.trim() && result.media_type)
}

type ProviderAttempt = {
  source: string
  result?: IdentifyResult
  error?: string
}

/**
 * Race provider promises; first response with name + media_type wins.
 * Failures / empty parses do not reject early — wait for remaining providers.
 */
async function raceFirstValid(
  providers: { source: string; run: () => Promise<IdentifyResult> }[],
): Promise<IdentifyResult> {
  if (providers.length === 0) {
    throw new Error('No identification providers configured')
  }

  if (providers.length === 1) {
    return providers[0].run()
  }

  return new Promise<IdentifyResult>((resolve, reject) => {
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
 * Identify a title from a screenshot.
 * Fires Gemini and Groq (when configured) in parallel; first valid result wins.
 */
export async function identifyScreenshot(
  imageBase64: string,
  mimeType: string,
): Promise<IdentifyResult> {
  const providers: { source: string; run: () => Promise<IdentifyResult> }[] = [
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
