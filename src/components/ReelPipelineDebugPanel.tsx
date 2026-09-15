import type { ReelPipelineDebug } from '@/lib/reels/pipeline-debug'

function DebugBlock({ label, children }: { label: string; children: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-amber-200/90">
        {label}
      </p>
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-page p-2 text-xs text-fg">
        {children}
      </pre>
    </div>
  )
}

function stringify(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return value || '(empty string)'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/** Temporary — remove after reel identification is stable. */
export function ReelPipelineDebugPanel({ debug }: { debug: ReelPipelineDebug }) {
  return (
    <div className="rounded-xl border border-amber-500/50 bg-amber-950/30 p-4 text-left">
      <p className="mb-3 text-sm font-medium text-amber-100">
        Reel pipeline debug (temporary)
      </p>
      <div className="space-y-3">
        <DebugBlock
          label="1. Supadata /metadata — description field"
          children={stringify(debug.metadataDescription)}
        />
        <DebugBlock
          label="1b. Supadata /metadata — full raw JSON"
          children={stringify(debug.metadataRaw)}
        />
        <DebugBlock
          label="1c. Metadata error (if any)"
          children={debug.metadataError ?? '(none)'}
        />
        <DebugBlock
          label="2. Supadata /transcript — joined text"
          children={stringify(debug.transcriptJoined)}
        />
        <DebugBlock
          label="2b. Transcript raw JSON"
          children={stringify(debug.transcriptRaw)}
        />
        <DebugBlock
          label="2c. Transcript error (if any)"
          children={debug.transcriptError ?? '(none)'}
        />
        <DebugBlock
          label="3. Combined text sent to Gemini/Groq"
          children={debug.combinedForAi || '(empty)'}
        />
        <DebugBlock
          label="4. AI extraction result"
          children={stringify(debug.aiResult)}
        />
      </div>
    </div>
  )
}
