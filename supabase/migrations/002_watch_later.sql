-- Replace duration buckets with when-to-watch buckets.
ALTER TABLE public.titles DROP CONSTRAINT IF EXISTS titles_time_commitment_check;

UPDATE public.titles
SET time_commitment = CASE time_commitment
  WHEN 'quick' THEN 'tonight'
  WHEN 'medium' THEN 'weekend'
  WHEN 'long' THEN 'soon'
  ELSE time_commitment
END
WHERE time_commitment IN ('quick', 'medium', 'long');

ALTER TABLE public.titles
  ADD CONSTRAINT titles_time_commitment_check
  CHECK (time_commitment IN ('tonight', 'weekend', 'soon'));
