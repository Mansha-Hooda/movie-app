export type MediaTypeGuess = 'movie' | 'show' | 'book'

export type IdentifyResult = {
  name: string | null
  media_type: MediaTypeGuess | null
  confidence: number
}

export type IdentifyHit = {
  name: string
  media_type: MediaTypeGuess
  confidence: number
}
