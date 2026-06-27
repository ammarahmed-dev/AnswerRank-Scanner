-- Backfill missing columns and fix permissions identified in state audit.

-- reports.updated_at: set on retest and stats writes
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- webhook_events: table exists but service_role was never granted access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_events TO service_role;
