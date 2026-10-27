-- Final step of the FRESH install recipe only, not an existing-database upgrade.
-- Historical migrations assumed automatic grants. Reset fresh-install table
-- ACLs explicitly so broad Supabase defaults and opt-in defaults converge.
BEGIN;
REVOKE ALL ON public.ai_visibility_runs,public.app_stats,public.audit_runs,
  public.compare_runs,public.contact_messages,public.monitor_snapshots,
  public.monitored_urls,public.profiles,public.reports,public.scan_usage,
  public.waitlist,public.webhook_events FROM service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.profiles,public.reports,public.scan_usage,
  public.webhook_events,public.app_stats,public.contact_messages,public.monitored_urls,
  public.monitor_snapshots,public.audit_runs,public.compare_runs TO service_role;
GRANT SELECT,INSERT ON public.ai_visibility_runs TO service_role;
-- The historical permission migration establishes the only browser exceptions:
-- waitlist INSERT and app_stats SELECT. Reapply to make that boundary explicit.
REVOKE ALL ON public.ai_visibility_runs,public.app_stats,public.audit_runs,
  public.compare_runs,public.contact_messages,public.monitor_snapshots,
  public.monitored_urls,public.profiles,public.reports,public.scan_usage,
  public.waitlist,public.webhook_events FROM PUBLIC,anon,authenticated;
GRANT INSERT ON public.waitlist TO anon,authenticated;
GRANT SELECT ON public.app_stats TO anon,authenticated;
COMMIT;
