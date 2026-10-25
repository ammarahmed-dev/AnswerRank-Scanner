BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
CREATE FUNCTION public.apply_billing_event(p_event_id text,p_user_id uuid,p_expected jsonb,p_patch jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_profile public.profiles%ROWTYPE;
BEGIN
  IF p_event_id IS NULL OR p_event_id !~ '^[a-f0-9]{64}$' OR
     p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' OR p_patch = '{}'::jsonb OR
     p_patch - ARRAY['plan','plan_expires_at','lemonsqueezy_subscription_id','lemonsqueezy_portal_url'] <> '{}'::jsonb OR
     p_expected IS NULL OR jsonb_typeof(p_expected) <> 'object' OR
     NOT (p_expected ?& ARRAY['plan','plan_expires_at','lemonsqueezy_subscription_id']) THEN
    RAISE EXCEPTION 'Invalid billing mutation' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_profile FROM public.profiles p WHERE p.id=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Billing profile missing' USING ERRCODE='P0002'; END IF;
  IF EXISTS(SELECT 1 FROM public.webhook_events e WHERE e.event_id=p_event_id) THEN RETURN false; END IF;
  IF coalesce(v_profile.plan,'free') IS DISTINCT FROM (p_expected->>'plan') OR
     v_profile.plan_expires_at IS DISTINCT FROM (p_expected->>'plan_expires_at')::timestamptz OR
     v_profile.lemonsqueezy_subscription_id IS DISTINCT FROM (p_expected->>'lemonsqueezy_subscription_id') THEN
    RAISE EXCEPTION 'Billing profile changed; retry event' USING ERRCODE='40001';
  END IF;
  INSERT INTO public.webhook_events(event_id,processed_at) VALUES(p_event_id,clock_timestamp())
    ON CONFLICT(event_id) DO NOTHING;
  IF NOT FOUND THEN
    IF EXISTS(SELECT 1 FROM public.webhook_events e WHERE e.event_id=p_event_id) THEN RETURN false; END IF;
    RAISE EXCEPTION 'Billing ledger insert affected no row';
  END IF;
  UPDATE public.profiles p SET
    plan=CASE WHEN p_patch ? 'plan' THEN p_patch->>'plan' ELSE p.plan END,
    plan_expires_at=CASE WHEN p_patch ? 'plan_expires_at' THEN (p_patch->>'plan_expires_at')::timestamptz ELSE p.plan_expires_at END,
    lemonsqueezy_subscription_id=CASE WHEN p_patch ? 'lemonsqueezy_subscription_id' THEN p_patch->>'lemonsqueezy_subscription_id' ELSE p.lemonsqueezy_subscription_id END,
    lemonsqueezy_portal_url=CASE WHEN p_patch ? 'lemonsqueezy_portal_url' THEN p_patch->>'lemonsqueezy_portal_url' ELSE p.lemonsqueezy_portal_url END
    WHERE p.id=p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Billing profile update affected no row'; END IF;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_billing_event(text,uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_billing_event(text,uuid,jsonb,jsonb) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
