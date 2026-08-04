export const IDENTIFY_PROMPT = `You are identifying a movie, TV show, or book from a screenshot.
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
