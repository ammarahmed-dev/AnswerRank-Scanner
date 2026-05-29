CREATE TABLE IF NOT EXISTS compare_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  url_a TEXT NOT NULL,
  url_b TEXT NOT NULL,
  score_a INTEGER,
  score_b INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS compare_runs_user_id_idx ON compare_runs(user_id);

ALTER TABLE compare_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own compare runs"
  ON compare_runs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own compare runs"
  ON compare_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
