export type MediaTypeGuess = 'movie' | 'show' | 'book'

export type IdentifyResult = {
  name: string | null
  media_type: MediaTypeGuess | null
  confidence: number
}
