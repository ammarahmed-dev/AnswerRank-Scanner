-- Atomic usage counting. Replaces the read-then-write in lib/usage-limits.ts, which let
-- concurrent requests exceed plan limits. The app falls back to the old logic until this exists.

-- Reserve one unit of usage if the current count is below p_limit.
-- Returns the new count, or -1 when the limit is already reached.
CREATE OR REPLACE FUNCTION public.reserve_scan_usage(p_client_key text, p_usage_date date, p_limit integer)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_limit <= 0 THEN
    RETURN -1;
  END IF;

  INSERT INTO public.scan_usage AS su (client_key, usage_date, scan_count, updated_at)
  VALUES (p_client_key, p_usage_date, 1, now())
  ON CONFLICT (client_key, usage_date) DO UPDATE
    SET scan_count = su.scan_count + 1, updated_at = now()
    WHERE su.scan_count < p_limit
  RETURNING su.scan_count INTO v_count;

  RETURN COALESCE(v_count, -1);
END;
$$;

-- Give back a reservation when the scan fails (failed scans do not count).
CREATE OR REPLACE FUNCTION public.release_scan_usage(p_client_key text, p_usage_date date)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE public.scan_usage
  SET scan_count = GREATEST(scan_count - 1, 0), updated_at = now()
  WHERE client_key = p_client_key AND usage_date = p_usage_date;
$$;

REVOKE ALL ON FUNCTION public.reserve_scan_usage(text, date, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_scan_usage(text, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_scan_usage(text, date, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_scan_usage(text, date) TO service_role;
