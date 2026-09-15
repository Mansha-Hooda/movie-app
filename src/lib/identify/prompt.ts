export const IDENTIFY_PROMPT = `You are identifying every movie, TV show, or book in a screenshot.
The image may be a text message, Google search, IMDb/Letterboxd page, Amazon listing, notification, listicle, ranking, or similar.

Return JSON only matching this schema:
{
  "titles": [
    {
      "name": string,
      "media_type": "movie" | "show" | "book",
      "confidence": number
    }
  ]
}

Rules:
- Extract EVERY distinct movie, TV show, or book title that is shown or clearly named
- name: the canonical title only (no year, no rank numbers, no "watch", no extra words)
- media_type: movie, show (TV series), or book
- confidence: 0 to 1 how sure you are this is the correct title and type
- Include a title only if you are reasonably sure it is a real movie, show, or book
- If nothing can be identified, return {"titles": []}
- Do not collapse a list into a single "best" title`
