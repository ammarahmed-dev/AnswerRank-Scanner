BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

-- The tracker uses server API routes for history and append-only observations.
-- RLS bypass alone does not grant table access. Do not add browser grants or
-- broaden the service role's existing UPDATE/DELETE/administrative privileges.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'ai_visibility_runs'
      AND c.relkind = 'r' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Expected AI visibility table with RLS enabled';
  END IF;
END;
$$;

GRANT SELECT, INSERT ON TABLE public.ai_visibility_runs TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
