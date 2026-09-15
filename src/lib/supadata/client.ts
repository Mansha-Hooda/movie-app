const SUPADATA_BASE = 'https://api.supadata.ai/v1'

export type SupadataErrorCode =
  | 'invalid-request'
  | 'internal-error'
  | 'forbidden'
  | 'unauthorized'
  | 'upgrade-required'
  | 'transcript-unavailable'
  | 'not-found'
  | 'limit-exceeded'
  | string

export class SupadataError extends Error {
  readonly code: SupadataErrorCode
  readonly status: number
  readonly details?: string

  constructor(
    message: string,
    code: SupadataErrorCode,
    status: number,
    details?: string,
  ) {
    super(message)
    this.name = 'SupadataError'
    this.code = code
    this.status = status
    this.details = details
  }
}

type SupadataErrorBody = {
  error?: SupadataErrorCode
  message?: string
  details?: string
}

export type SupadataMetadata = {
  description?: string | null
  title?: string | null
}

export type TranscriptChunk = {
  text?: string
}

type TranscriptResponse = {
  content?: string | TranscriptChunk[]
  lang?: string
  jobId?: string
}

function getApiKey(): string {
  const key = process.env.SUPADATA_API_KEY?.trim()
  if (!key) {
    throw new SupadataError(
      'SUPADATA_API_KEY is not configured',
      'unauthorized',
      503,
    )
  }
  return key
}

async function parseError(response: Response): Promise<SupadataError> {
  let body: SupadataErrorBody = {}
  try {
    body = (await response.json()) as SupadataErrorBody
  } catch {
    // ignore
  }
  const code = body.error || 'internal-error'
  const message =
    body.message ||
    body.details ||
    `Supadata request failed (${response.status})`
  return new SupadataError(message, code, response.status, body.details)
}

async function supadataFetch(path: string, query: Record<string, string>) {
  const key = getApiKey()
  const url = new URL(`${SUPADATA_BASE}${path}`)
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, v)
  }

  const response = await fetch(url.toString(), {
    headers: {
      'x-api-key': key,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw await parseError(response)
  }

  return response
}

export type ReelMetadataFetch = SupadataMetadata & {
  raw: Record<string, unknown>
}

function formatSupadataError(error: unknown): string {
  if (error instanceof SupadataError) {
    const parts = [error.code, error.message, `HTTP ${error.status}`]
    if (error.details) parts.push(error.details)
    return parts.filter(Boolean).join(' — ')
  }
  if (error instanceof Error) return error.message
  return String(error)
}

/** Caption / description for a public reel or post. */
export async function fetchReelMetadata(reelUrl: string): Promise<ReelMetadataFetch> {
  const response = await supadataFetch('/metadata', { url: reelUrl })
  const data = (await response.json()) as Record<string, unknown> & {
    description?: string | null
    title?: string | null
  }
  return {
    description: data.description ?? null,
    title: data.title ?? null,
    raw: data,
  }
}

export { formatSupadataError }

function transcriptContentToString(
  content: string | TranscriptChunk[] | undefined,
): string {
  if (!content) return ''
  if (typeof content === 'string') return content.trim()
  return content
    .map((chunk) => chunk.text?.trim())
    .filter(Boolean)
    .join(' ')
    .trim()
}

async function pollTranscriptJob(jobId: string): Promise<string> {
  const maxAttempts = 24
  const delayMs = 1250

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    const key = getApiKey()
    const response = await fetch(`${SUPADATA_BASE}/transcript/${jobId}`, {
      headers: { 'x-api-key': key, Accept: 'application/json' },
      cache: 'no-store',
    })

    if (response.status === 202) {
      continue
    }

    if (!response.ok) {
      throw await parseError(response)
    }

    const data = (await response.json()) as TranscriptResponse
    if (data.jobId) {
      continue
    }

    return transcriptContentToString(data.content)
  }

  throw new SupadataError(
    'Transcript is still processing — try again in a moment',
    'internal-error',
    504,
  )
}

export type ReelTranscriptFetch = {
  text: string
  raw: unknown
}

/** Spoken audio transcript for a public reel (caption + speech). */
export async function fetchReelTranscript(
  reelUrl: string,
): Promise<ReelTranscriptFetch> {
  const response = await supadataFetch('/transcript', {
    url: reelUrl,
    text: 'false',
    mode: 'auto',
  })

  const data = (await response.json()) as TranscriptResponse

  if (data.jobId) {
    const text = await pollTranscriptJob(data.jobId)
    return {
      text,
      raw: { initial: data, note: 'Transcript completed via async job polling' },
    }
  }

  return {
    text: transcriptContentToString(data.content),
    raw: data,
  }
}

export function isSupadataAccessError(error: unknown): boolean {
  if (!(error instanceof SupadataError)) return false
  return (
    error.code === 'not-found' ||
    error.code === 'forbidden' ||
    error.code === 'unauthorized' ||
    error.status === 404 ||
    error.status === 403
  )
}

export function isSupadataConfigured(): boolean {
  return Boolean(process.env.SUPADATA_API_KEY?.trim())
}
