BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
CREATE FUNCTION public.save_onetime_report(p_user_id uuid,p_report_id uuid,p_report jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_profile public.profiles%ROWTYPE; v_url text; v_score numeric;
BEGIN
  IF p_user_id IS NULL OR p_report_id IS NULL OR jsonb_typeof(p_report) IS DISTINCT FROM 'object' OR
     p_report->>'reportId' IS DISTINCT FROM p_report_id::text OR
     jsonb_typeof(p_report->'url') IS DISTINCT FROM 'string' OR
     coalesce(p_report->>'url','') !~ '^https?://' OR
     jsonb_typeof(p_report->'score') IS DISTINCT FROM 'number' OR
     p_report->'isFullReport' IS DISTINCT FROM 'true'::jsonb THEN
    RAISE EXCEPTION 'Invalid one-time report' USING ERRCODE='22023';
  END IF;
  v_url := p_report->>'url'; v_score := (p_report->>'score')::numeric;
  IF v_score < 0 OR v_score > 100 OR v_score <> trunc(v_score) THEN
    RAISE EXCEPTION 'Invalid report score' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_profile FROM public.profiles p WHERE p.id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'One-time profile missing' USING ERRCODE='P0002'; END IF;
  IF v_profile.plan <> 'onetime' OR
     (v_profile.plan_expires_at IS NOT NULL AND v_profile.plan_expires_at < clock_timestamp()) OR
     v_profile.onetime_scan_count < 0 OR v_profile.onetime_scan_count >= 4 OR
     (v_profile.onetime_url IS NOT NULL AND v_profile.onetime_url <> v_url) THEN
    RAISE EXCEPTION 'One-time right changed or exhausted' USING ERRCODE='40001';
  END IF;
  INSERT INTO public.reports(id,user_id,url,score,retest_count,max_retests,result,created_at)
    VALUES(p_report_id,p_user_id,v_url,v_score::integer,coalesce((p_report->>'retest_count')::integer,0),
      coalesce((p_report->>'max_retests')::integer,3),p_report,
      coalesce((p_report->>'scannedAt')::timestamptz,clock_timestamp()));
  IF NOT FOUND THEN RAISE EXCEPTION 'Report insert affected no row'; END IF;
  UPDATE public.profiles p SET onetime_url=v_url,onetime_scan_count=p.onetime_scan_count+1 WHERE p.id=p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'One-time consumption affected no row'; END IF;
  RETURN p_report_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_onetime_report(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_onetime_report(uuid,uuid,jsonb) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
