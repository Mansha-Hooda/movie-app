export type SearchResult = {
  id: string
  name: string
  year: string | null
  poster_url: string | null
}

export type EnrichmentData = {
  name: string
  poster_url: string | null
  genre: string | null
  runtime_or_pages: number | null
  synopsis: string | null
}
