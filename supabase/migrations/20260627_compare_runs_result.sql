-- Store full comparison result and a share token so compare reports survive
-- across tabs and sessions without relying on sessionStorage.
-- Also grants service_role the privileges it needs (missing from original migration).

-- Grant service_role access so the API (which uses service role key) can read/write.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.compare_runs TO service_role;

ALTER TABLE compare_runs
  ADD COLUMN IF NOT EXISTS result JSONB,
  ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid() NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS compare_runs_share_token_idx ON compare_runs(share_token);

-- Allow anyone to read a compare run by share_token (result data is not sensitive).
CREATE POLICY "Anyone can read compare run by share token"
  ON compare_runs FOR SELECT
  USING (true);
