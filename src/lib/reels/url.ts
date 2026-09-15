const INSTAGRAM_PATH =
  /https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv)\/[\w-]+(?:\/)?/i

/** Pull the first Instagram reel/post URL from arbitrary share text. */
export function extractInstagramUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const match = trimmed.match(INSTAGRAM_PATH)
  if (match) {
    return match[0].replace(/\/$/, '')
  }

  try {
    const asUrl = new URL(trimmed)
    if (/instagram\.com$/i.test(asUrl.hostname.replace(/^www\./, ''))) {
      if (/^\/(reel|p|tv)\//.test(asUrl.pathname)) {
        return `${asUrl.origin}${asUrl.pathname}`.replace(/\/$/, '')
      }
    }
  } catch {
    // not a bare URL
  }

  return null
}

/** Resolve a shared link from Android share_target fields (url, text, title). */
export function resolveSharedInstagramUrl(
  urlField?: string | null,
  textField?: string | null,
  titleField?: string | null,
): string | null {
  for (const candidate of [urlField, textField, titleField]) {
    if (!candidate?.trim()) continue
    const found = extractInstagramUrl(candidate)
    if (found) return found
  }
  return null
}

export function isInstagramReelUrl(url: string): boolean {
  return Boolean(extractInstagramUrl(url))
}
