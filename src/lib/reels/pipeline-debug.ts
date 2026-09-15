import type { IdentifyResult } from '@/lib/identify/types'

/** Temporary reel pipeline diagnostics (remove after debugging). */
export type ReelPipelineDebug = {
  metadataRaw: unknown
  metadataDescription: string | null
  metadataTitle: string | null
  metadataError: string | null
  transcriptJoined: string | null
  transcriptRaw: unknown
  transcriptError: string | null
  combinedForAi: string
  aiResult: IdentifyResult | null
}
