-- Existing snapshots remain unversioned; never infer historical scoring rules.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
ALTER TABLE public.monitor_snapshots
  ADD COLUMN IF NOT EXISTS methodology_version text;
COMMENT ON COLUMN public.monitor_snapshots.methodology_version IS
  'Scoring method recorded by the producing scan. NULL means historical or unknown.';
NOTIFY pgrst, 'reload schema';
COMMIT;
