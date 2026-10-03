-- The "Anyone can read compare run by share token" policy used USING (true), which let anyone
-- holding the public anon key list every compare run (user_id, URLs, results).
-- All compare_runs reads go through API routes using the service role, which bypasses RLS,
-- so share links keep working via /api/compare-result?token=...
DROP POLICY IF EXISTS "Anyone can read compare run by share token" ON public.compare_runs;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.compare_runs FROM anon;
