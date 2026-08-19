export type MediaType = 'movie' | 'show' | 'book'
export type WatchLater = 'tonight' | 'weekend' | 'soon'
export type TitleStatus = 'backlog' | 'in_progress' | 'done'

/** Row shape for the existing Supabase `titles` table. */
export type Title = {
  id: string
  user_id: string
  name: string
  media_type: MediaType
  suggested_by: string | null
  mood_tags: string[]
  time_commitment: WatchLater
  status: TitleStatus
  rating: number | null
  poster_url: string | null
  genre: string | null
  runtime_or_pages: number | null
  synopsis: string | null
  date_added: string
}

export type Database = {
  public: {
    Tables: {
      titles: {
        Row: Title
        Insert: {
          id?: string
          user_id: string
          name: string
          media_type: MediaType
          suggested_by?: string | null
          mood_tags?: string[]
          time_commitment: WatchLater
          status?: TitleStatus
          rating?: number | null
          poster_url?: string | null
          genre?: string | null
          runtime_or_pages?: number | null
          synopsis?: string | null
          date_added?: string
        }
        Update: {
          name?: string
          media_type?: MediaType
          suggested_by?: string | null
          mood_tags?: string[]
          time_commitment?: WatchLater
          status?: TitleStatus
          rating?: number | null
          poster_url?: string | null
          genre?: string | null
          runtime_or_pages?: number | null
          synopsis?: string | null
          date_added?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
