-- AI Visibility Tracker: brands a user wants checked every week by the cron.
-- Additive; safe to apply before the feature is enabled. Writes come from the server with the
-- service role key; users can only read their own rows.
CREATE TABLE IF NOT EXISTS public.ai_visibility_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  prompts JSONB NOT NULL,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, domain)
);

CREATE INDEX IF NOT EXISTS ai_visibility_tracks_due_idx
  ON public.ai_visibility_tracks (last_run_at NULLS FIRST);

ALTER TABLE public.ai_visibility_tracks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own AI visibility tracks" ON public.ai_visibility_tracks;
CREATE POLICY "Users can read their own AI visibility tracks"
  ON public.ai_visibility_tracks FOR SELECT
  USING (auth.uid() = user_id);
