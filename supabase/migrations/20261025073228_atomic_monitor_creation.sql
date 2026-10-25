BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
CREATE FUNCTION public.create_monitor_with_limit(p_user_id uuid,p_url text,p_label text,p_limit integer)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_monitor public.monitored_urls%ROWTYPE;
BEGIN
  IF p_user_id IS NULL OR p_limit IS NULL OR p_limit <= 0 OR p_limit > 999 OR
     p_url IS NULL OR p_url !~ '^https?://' OR octet_length(p_url) > 65536 OR
     octet_length(coalesce(p_label,'')) > 32768 THEN
    RAISE EXCEPTION 'Invalid monitor creation input' USING ERRCODE='22023';
  END IF;
  -- The count must take a fresh snapshot after any previous creator releases the lock.
  IF current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'Monitor creation requires read committed isolation' USING ERRCODE='25001';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('aeocheck:monitor-create:' || p_user_id::text,0));
  IF (SELECT count(*) FROM public.monitored_urls m WHERE m.user_id=p_user_id) >= p_limit THEN
    RETURN jsonb_build_object('limit_reached',true);
  END IF;
  INSERT INTO public.monitored_urls(user_id,url,label,frequency)
    VALUES(p_user_id,p_url,p_label,'weekly') RETURNING * INTO v_monitor;
  IF NOT FOUND THEN RAISE EXCEPTION 'Monitor insert affected no row'; END IF;
  RETURN jsonb_build_object('limit_reached',false,'item',jsonb_build_object(
    'id',v_monitor.id,'url',v_monitor.url,'label',v_monitor.label,'frequency',v_monitor.frequency,
    'last_scanned_at',v_monitor.last_scanned_at,'created_at',v_monitor.created_at));
END;
$$;
REVOKE ALL ON FUNCTION public.create_monitor_with_limit(uuid,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_monitor_with_limit(uuid,text,text,integer) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
