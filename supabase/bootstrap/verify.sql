-- Read-only catalog assertions. No customer rows are read or written.
DO $$
DECLARE
  t text; r text; p text; expected boolean; rpc_count integer;
  tables text[] := ARRAY['ai_visibility_runs','app_stats','audit_runs','compare_runs',
    'contact_messages','monitor_snapshots','monitored_urls','profiles','reports',
    'scan_usage','waitlist','webhook_events'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=t AND c.relkind='r' AND c.relrowsecurity) THEN
      RAISE EXCEPTION 'Missing RLS application table: %',t;
    END IF;
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
      FOREACH p IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
        expected := (t='waitlist' AND p='INSERT') OR (t='app_stats' AND p='SELECT');
        IF has_table_privilege(r,'public.'||t,p) IS DISTINCT FROM expected THEN
          RAISE EXCEPTION 'Unexpected browser privilege: % % %',r,t,p;
        END IF;
      END LOOP;
    END LOOP;
    FOREACH p IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] LOOP
      expected := p IN ('SELECT','INSERT','UPDATE','DELETE') AND t <> 'waitlist' AND (t <> 'ai_visibility_runs' OR p IN ('SELECT','INSERT'));
      IF has_table_privilege('service_role','public.'||t,p) IS DISTINCT FROM expected THEN
        RAISE EXCEPTION 'Unexpected service privilege: % %',t,p;
      END IF;
    END LOOP;
  END LOOP;
  SELECT count(*) INTO rpc_count FROM pg_proc f JOIN pg_namespace n ON n.oid=f.pronamespace
    WHERE n.nspname='public' AND f.proname IN ('reserve_scan_usage','release_scan_usage',
      'apply_billing_event','save_onetime_report','create_monitor_with_limit',
      'save_monitor_snapshot','create_audit_with_limits','save_audit_page_result')
      AND NOT f.prosecdef AND has_function_privilege('service_role',f.oid,'EXECUTE')
      AND NOT has_function_privilege('anon',f.oid,'EXECUTE')
      AND NOT has_function_privilege('authenticated',f.oid,'EXECUTE');
  IF rpc_count <> 8 THEN RAISE EXCEPTION 'Expected eight service-only invoker RPCs'; END IF;
END;
$$;
