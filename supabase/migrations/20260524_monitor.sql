-- Monitor feature: tracked URLs and score snapshots

CREATE TABLE IF NOT EXISTS monitored_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  label TEXT,
  frequency TEXT NOT NULL DEFAULT 'weekly', -- 'weekly' or 'monthly'
  last_scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, url)
);

CREATE TABLE IF NOT EXISTS monitor_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitored_url_id UUID NOT NULL REFERENCES monitored_urls(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  category_scores JSONB,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE monitored_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitor_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own monitored URLs"
  ON monitored_urls FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own snapshots"
  ON monitor_snapshots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM monitored_urls
      WHERE monitored_urls.id = monitor_snapshots.monitored_url_id
      AND monitored_urls.user_id = auth.uid()
    )
  );
