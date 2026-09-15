export const IDENTIFY_REEL_PROMPT = `You are identifying every movie, TV show, or book mentioned in an Instagram reel.
You will receive the reel's written caption and/or a transcript of spoken audio from the video.

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
- Extract EVERY distinct movie, TV show, or book title that is recommended, named, or clearly discussed
- name: the canonical title only (no year, no hashtags, no "watch", no extra words)
- media_type: movie, show (TV series), or book
- confidence: 0 to 1 how sure you are this is the correct title and type
- Prefer explicit recommendations ("you need to watch X", "read Y") over background music or unrelated mentions
- Hashtags and @mentions are not titles unless they clearly name a film/show/book
- If nothing can be identified, return {"titles": []}
- Do not collapse a list into a single "best" title`
