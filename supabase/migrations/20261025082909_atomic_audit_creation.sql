BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
-- Reconcile the historical base migration with the existing live/API field.
ALTER TABLE public.audit_runs ADD COLUMN IF NOT EXISTS total_discovered integer DEFAULT 0;
CREATE FUNCTION public.create_audit_with_limits(
  p_user_id uuid,p_domain text,p_urls jsonb,p_total_discovered integer,p_page_limit integer,
  p_monthly_limit integer,p_rolling_limit integer,p_window_hours integer
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_now timestamptz; v_month timestamptz; v_id uuid; v_pages integer;
BEGIN
  IF p_user_id IS NULL OR p_domain IS NULL OR btrim(p_domain)='' OR
     p_page_limit IS NULL OR p_page_limit < 1 OR p_page_limit > 500 OR
     jsonb_typeof(p_urls) IS DISTINCT FROM 'array' OR
     (p_monthly_limit IS NOT NULL AND (p_monthly_limit < 1 OR p_monthly_limit > 999)) OR
     (p_rolling_limit IS NOT NULL AND (p_rolling_limit < 1 OR p_rolling_limit > 999 OR
       p_window_hours IS NULL OR p_window_hours < 1 OR p_window_hours > 8760)) THEN
    RAISE EXCEPTION 'Invalid audit creation input' USING ERRCODE='22023';
  END IF;
  v_pages := jsonb_array_length(p_urls);
  IF v_pages < 1 OR v_pages > p_page_limit OR p_total_discovered IS NULL OR p_total_discovered < v_pages OR
     EXISTS(SELECT 1 FROM jsonb_array_elements(p_urls) u WHERE jsonb_typeof(u) <> 'string' OR (u #>> '{}') !~ '^https?://') OR
     (SELECT count(DISTINCT u) FROM jsonb_array_elements(p_urls) u) <> v_pages THEN
    RAISE EXCEPTION 'Invalid audit targets' USING ERRCODE='22023';
  END IF;
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'Audit creation requires read committed isolation' USING ERRCODE='25001';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('aeocheck:audit-create:' || p_user_id::text,0));
  v_now := clock_timestamp();
  v_month := date_trunc('month',v_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  IF p_monthly_limit IS NOT NULL AND
     (SELECT count(*) FROM public.audit_runs a WHERE a.user_id=p_user_id AND a.created_at >= v_month) >= p_monthly_limit THEN
    RETURN jsonb_build_object('limit_reached','monthly');
  END IF;
  IF p_rolling_limit IS NOT NULL AND
     (SELECT count(*) FROM public.audit_runs a WHERE a.user_id=p_user_id AND a.created_at >= v_now-make_interval(hours=>p_window_hours)) >= p_rolling_limit THEN
    RETURN jsonb_build_object('limit_reached','rolling');
  END IF;
  INSERT INTO public.audit_runs(user_id,domain,status,total_pages,scanned_pages,page_limit,total_discovered,urls,results,created_at)
    VALUES(p_user_id,p_domain,'pending',v_pages,0,p_page_limit,p_total_discovered,p_urls,'[]'::jsonb,v_now)
    RETURNING id INTO v_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Audit insert affected no row'; END IF;
  RETURN jsonb_build_object('limit_reached',NULL,'id',v_id);
END;
$$;
REVOKE ALL ON FUNCTION public.create_audit_with_limits(uuid,text,jsonb,integer,integer,integer,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_audit_with_limits(uuid,text,jsonb,integer,integer,integer,integer,integer) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
