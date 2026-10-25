BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
CREATE FUNCTION public.save_monitor_snapshot(
  p_monitor_id uuid, p_user_id uuid, p_score integer,
  p_category_scores jsonb, p_methodology_version text
) RETURNS TABLE(id uuid, score integer, scanned_at timestamptz)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  v_snapshot public.monitor_snapshots%ROWTYPE;
  v_now timestamptz;
BEGIN
  IF p_score IS NULL OR p_score < 0 OR p_score > 100 OR
     p_category_scores IS NULL OR jsonb_typeof(p_category_scores) <> 'object' THEN
    RAISE EXCEPTION 'Invalid monitor observation' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.monitored_urls m
    WHERE m.id = p_monitor_id AND m.user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Monitor not found for owner' USING ERRCODE = 'P0002';
  END IF;
  v_now := clock_timestamp();
  INSERT INTO public.monitor_snapshots(monitored_url_id,score,category_scores,methodology_version,scanned_at)
    VALUES(p_monitor_id,p_score,p_category_scores,p_methodology_version,v_now)
    RETURNING * INTO v_snapshot;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Snapshot insert affected no row';
  END IF;
  UPDATE public.monitored_urls m SET last_scanned_at = v_now WHERE m.id = p_monitor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Monitor schedule update affected no row';
  END IF;
  RETURN QUERY SELECT v_snapshot.id, v_snapshot.score, v_snapshot.scanned_at;
END;
$$;
REVOKE ALL ON FUNCTION public.save_monitor_snapshot(uuid,uuid,integer,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_monitor_snapshot(uuid,uuid,integer,jsonb,text) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
