import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  MediaType,
  TimeCommitment,
  Title,
  TitleStatus,
} from '@/types/database'

export type CreateTitleInput = {
  name: string
  media_type: MediaType
  suggested_by?: string
  mood_tags: string[]
  time_commitment: TimeCommitment
  poster_url?: string | null
  genre?: string | null
  runtime_or_pages?: number | null
  synopsis?: string | null
}

export async function fetchUserTitles(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ data: Title[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('titles')
    .select('*')
    .eq('user_id', userId)
    .order('date_added', { ascending: false })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data, error: null }
}

export async function createTitle(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: CreateTitleInput,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('titles').insert({
    user_id: userId,
    name: input.name.trim(),
    media_type: input.media_type,
    suggested_by: input.suggested_by?.trim() || null,
    mood_tags: input.mood_tags,
    time_commitment: input.time_commitment,
    status: 'backlog',
    poster_url: input.poster_url ?? null,
    genre: input.genre ?? null,
    runtime_or_pages: input.runtime_or_pages ?? null,
    synopsis: input.synopsis ?? null,
  })

  if (error) {
    return { error: new Error(error.message) }
  }

  return { error: null }
}

export async function updateTitleStatus(
  supabase: SupabaseClient<Database>,
  titleId: string,
  status: TitleStatus,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('titles')
    .update({ status })
    .eq('id', titleId)

  if (error) {
    return { error: new Error(error.message) }
  }

  return { error: null }
}

export async function updateTitleRating(
  supabase: SupabaseClient<Database>,
  titleId: string,
  rating: number,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('titles')
    .update({ rating })
    .eq('id', titleId)

  if (error) {
    return { error: new Error(error.message) }
  }

  return { error: null }
}
