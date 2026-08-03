-- Milestone 1: titles table for media backlog items
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

CREATE TABLE public.titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('movie', 'show', 'book')),
  suggested_by text,
  mood_tags text[] NOT NULL DEFAULT '{}',
  time_commitment text NOT NULL CHECK (time_commitment IN ('quick', 'medium', 'long')),
  status text NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'in_progress', 'done')),
  rating integer CHECK (rating >= 1 AND rating <= 5),
  poster_url text,
  genre text,
  runtime_or_pages integer,
  synopsis text,
  date_added timestamptz NOT NULL DEFAULT now()
);

-- Row Level Security: users can only access their own rows
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own titles"
  ON public.titles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own titles"
  ON public.titles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own titles"
  ON public.titles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own titles"
  ON public.titles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for common query patterns (future milestones)
CREATE INDEX titles_user_id_idx ON public.titles (user_id);
CREATE INDEX titles_user_status_idx ON public.titles (user_id, status);
