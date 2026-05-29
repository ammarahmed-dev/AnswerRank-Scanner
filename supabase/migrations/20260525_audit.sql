CREATE TABLE IF NOT EXISTS audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_pages INTEGER DEFAULT 0,
  scanned_pages INTEGER DEFAULT 0,
  aggregate_score INTEGER,
  page_limit INTEGER NOT NULL DEFAULT 5,
  urls JSONB DEFAULT '[]'::jsonb,
  results JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own audits"
  ON audit_runs FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_runs TO service_role;
