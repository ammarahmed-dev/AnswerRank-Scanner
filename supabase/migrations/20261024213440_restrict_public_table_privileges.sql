-- Browser access is explicitly granted per application requirements.
-- Browser table access is limited to waitlist INSERT and public statistics SELECT.
-- Customer data, quota enforcement and contact submissions use server APIs with
-- service_role. RLS alone does not constrain TRUNCATE or bypass application limits.
REVOKE ALL PRIVILEGES ON TABLE
  public.ai_visibility_runs, public.app_stats, public.audit_runs,
  public.compare_runs, public.contact_messages, public.monitor_snapshots,
  public.monitored_urls, public.profiles, public.reports, public.scan_usage,
  public.waitlist, public.webhook_events
FROM PUBLIC, anon, authenticated;

GRANT INSERT ON TABLE public.waitlist TO anon, authenticated;
GRANT SELECT ON TABLE public.app_stats TO anon, authenticated;

-- supabase-js INSERT uses return=minimal here, so public SELECT is unnecessary.
DROP POLICY IF EXISTS "Allow waitlist public select for insert return" ON public.waitlist;

-- Future postgres-owned tables require explicit browser grants in their migration.
-- Existing service_role privileges and all customer rows remain unchanged.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, anon, authenticated;
