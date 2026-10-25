BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
CREATE FUNCTION public.save_audit_page_result(p_audit_id uuid,p_user_id uuid,p_page_result jsonb)
RETURNS TABLE(scanned_pages integer,total_pages integer,aggregate_score integer,complete boolean)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_audit public.audit_runs%ROWTYPE;
  v_results jsonb;
  v_count integer;
  v_score integer;
  v_complete boolean;
BEGIN
  IF p_page_result IS NULL OR jsonb_typeof(p_page_result) <> 'object' OR
     octet_length(p_page_result::text) > 65536 OR
     jsonb_typeof(p_page_result->'url') IS DISTINCT FROM 'string' OR coalesce(p_page_result->>'url','') = '' OR
     jsonb_typeof(p_page_result->'score') IS DISTINCT FROM 'number' OR
     coalesce(p_page_result->>'status','') NOT IN ('done','error') THEN
    RAISE EXCEPTION 'Invalid audit page result' USING ERRCODE='22023';
  END IF;
  IF (p_page_result->>'score')::numeric < 0 OR (p_page_result->>'score')::numeric > 100 OR
     (p_page_result->>'score')::numeric <> trunc((p_page_result->>'score')::numeric) OR
     (p_page_result->>'status' = 'error' AND coalesce(p_page_result->>'error','') = '') OR
     (p_page_result->>'status' = 'done' AND coalesce(p_page_result->>'error','') <> '') THEN
    RAISE EXCEPTION 'Invalid audit page score or status' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_audit FROM public.audit_runs a
    WHERE a.id=p_audit_id AND a.user_id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Audit not found for owner' USING ERRCODE='P0002'; END IF;
  IF v_audit.status NOT IN ('pending','running') THEN
    RAISE EXCEPTION 'Audit is already finished' USING ERRCODE='55000';
  END IF;
  IF jsonb_typeof(v_audit.urls) IS DISTINCT FROM 'array' OR
     jsonb_typeof(coalesce(v_audit.results,'[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Invalid stored audit state' USING ERRCODE='22023';
  END IF;
  IF v_audit.total_pages IS NULL OR v_audit.total_pages <= 0 OR
     v_audit.total_pages <> jsonb_array_length(v_audit.urls) THEN
    RAISE EXCEPTION 'Invalid stored audit page count' USING ERRCODE='22023';
  END IF;
  IF NOT (v_audit.urls @> jsonb_build_array(p_page_result->>'url')) THEN
    RAISE EXCEPTION 'URL is not part of this audit' USING ERRCODE='22023';
  END IF;
  v_results := coalesce(v_audit.results,'[]'::jsonb);
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(v_results) r WHERE r->>'url'=p_page_result->>'url') THEN
    RAISE EXCEPTION 'Page already recorded' USING ERRCODE='23505';
  END IF;
  v_results := v_results || jsonb_build_array(p_page_result);
  v_count := jsonb_array_length(v_results);
  IF v_count > v_audit.total_pages THEN RAISE EXCEPTION 'Audit has no remaining pages' USING ERRCODE='55000'; END IF;
  SELECT round(avg((r->>'score')::numeric))::integer INTO v_score
    FROM jsonb_array_elements(v_results) r
    WHERE coalesce(r->>'error','')='' AND jsonb_typeof(r->'score')='number';
  v_complete := v_count >= v_audit.total_pages;
  UPDATE public.audit_runs a SET results=v_results,scanned_pages=v_count,aggregate_score=v_score,
    status=CASE WHEN v_complete THEN 'completed' ELSE 'running' END,
    completed_at=CASE WHEN v_complete THEN clock_timestamp() ELSE NULL END
    WHERE a.id=p_audit_id AND a.user_id=p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Audit save affected no row'; END IF;
  RETURN QUERY SELECT v_count,v_audit.total_pages,v_score,v_complete;
END;
$$;
REVOKE ALL ON FUNCTION public.save_audit_page_result(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_audit_page_result(uuid,uuid,jsonb) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
