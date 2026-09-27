import 'server-only'

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

/** Caption / description for a public reel or post. */
export async function fetchReelMetadata(
  reelUrl: string,
): Promise<SupadataMetadata> {
  const response = await supadataFetch('/metadata', { url: reelUrl })
  const data = (await response.json()) as SupadataMetadata & {
    description?: string | null
    title?: string | null
  }
  return {
    description: data.description ?? null,
    title: data.title ?? null,
  }
}

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

/** Spoken audio transcript for a public reel (caption + speech). */
export async function fetchReelTranscript(reelUrl: string): Promise<string> {
  const response = await supadataFetch('/transcript', {
    url: reelUrl,
    text: 'false',
    mode: 'auto',
  })

  const data = (await response.json()) as TranscriptResponse

  if (data.jobId) {
    return pollTranscriptJob(data.jobId)
  }

  return transcriptContentToString(data.content)
}

const VISUAL_PROMPT =
  'Identify every movie, TV show, or book title visible on screen in this video, including on-screen text, title cards, and recognizable posters. Ignore usernames, hashtags, and app interface text.'

const VISUAL_SCHEMA = {
  type: 'object',
  properties: {
    titles: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          media_type: { type: 'string', enum: ['movie', 'show', 'book'] },
          where_seen: { type: 'string' },
        },
        required: ['name', 'media_type'],
      },
    },
  },
  required: ['titles'],
} as const

type VisualTitle = {
  name?: string
  media_type?: string
  where_seen?: string
}

type ExtractJobResponse = {
  jobId?: string
  status?: 'queued' | 'active' | 'completed' | 'failed' | string
  data?: { titles?: VisualTitle[] } | null
  error?: { message?: string; details?: string } | string | null
}

function formatVisualTitles(titles: VisualTitle[] | undefined): string {
  const lines = (titles ?? [])
    .map((title) => {
      const name = title.name?.trim()
      if (!name) return null
      const type = title.media_type?.trim()
      const where = title.where_seen?.trim()
      const suffix = [type, where].filter(Boolean).join(', ')
      return suffix ? `- ${name} (${suffix})` : `- ${name}`
    })
    .filter((line): line is string => Boolean(line))

  if (lines.length === 0) return ''
  return `On screen:\n${lines.join('\n')}`
}

async function pollExtractJob(jobId: string): Promise<string> {
  const maxAttempts = 30
  const delayMs = 1000

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    const key = getApiKey()
    const response = await fetch(`${SUPADATA_BASE}/extract/${encodeURIComponent(jobId)}`, {
      headers: { 'x-api-key': key, Accept: 'application/json' },
      cache: 'no-store',
    })

    if (response.status === 202) continue
    if (!response.ok) throw await parseError(response)

    const data = (await response.json()) as ExtractJobResponse
    if (data.status === 'queued' || data.status === 'active' || data.jobId) {
      if (data.status !== 'completed' && data.status !== 'failed') continue
    }
    if (data.status === 'failed') {
      const message =
        typeof data.error === 'string'
          ? data.error
          : data.error?.message || 'Video analysis failed'
      throw new SupadataError(message, 'internal-error', 502)
    }
    if (data.status === 'completed') {
      return formatVisualTitles(data.data?.titles)
    }
  }

  throw new SupadataError(
    'Video analysis is still processing',
    'internal-error',
    504,
  )
}

/**
 * On-screen title pass. Supadata charges 5 credits per extraction minute
 * (minimum 5). Polling the job does not cost credits.
 */
export async function fetchReelVisualAnalysis(reelUrl: string): Promise<string> {
  const key = getApiKey()
  const response = await fetch(`${SUPADATA_BASE}/extract`, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    body: JSON.stringify({
      url: reelUrl,
      prompt: VISUAL_PROMPT,
      schema: VISUAL_SCHEMA,
    }),
  })

  if (!response.ok) {
    throw await parseError(response)
  }

  const data = (await response.json()) as ExtractJobResponse
  if (data.jobId) {
    return pollExtractJob(data.jobId)
  }

  return formatVisualTitles(data.data?.titles)
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
