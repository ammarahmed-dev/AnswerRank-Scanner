-- AI Visibility Tracker: one row per run (brand + prompts asked of AI engines + results).
-- Additive and safe to apply before the feature is enabled. Writes come from the server with the
-- service role key; users can only read their own rows.
CREATE TABLE IF NOT EXISTS public.ai_visibility_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  prompts JSONB NOT NULL,
  engines JSONB NOT NULL,
  mention_rate INTEGER NOT NULL,
  citation_rate INTEGER NOT NULL,
  checked INTEGER NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_visibility_runs_user_domain_idx
  ON public.ai_visibility_runs (user_id, domain, created_at DESC);

ALTER TABLE public.ai_visibility_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own AI visibility runs" ON public.ai_visibility_runs;
CREATE POLICY "Users can read their own AI visibility runs"
  ON public.ai_visibility_runs FOR SELECT
  USING (auth.uid() = user_id);
