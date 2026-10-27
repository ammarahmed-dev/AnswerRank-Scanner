-- Fresh, unexposed databases only. This is NOT a production upgrade migration.
-- Supply Supabase-managed auth.users/auth.uid() and roles before running.
BEGIN;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname = ANY (ARRAY[
      'profiles','reports','scan_usage','webhook_events','app_stats','contact_messages',
      'waitlist','monitored_urls','monitor_snapshots','audit_runs','compare_runs','ai_visibility_runs'])
  ) THEN
    RAISE EXCEPTION 'Bootstrap requires an empty application schema; use reviewed upgrades for existing databases';
  END IF;
END;
$$;

-- Missing historical prerequisites reconciled against live catalog metadata on
-- 27 October 2026. Later fields remain in their existing incremental migrations.
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','agency')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  plan_expires_at timestamptz,
  lemonsqueezy_customer_id text,
  lemonsqueezy_subscription_id text,
  welcome_email_sent boolean DEFAULT false,
  followup_email_sent boolean DEFAULT false
);
CREATE TABLE public.reports (
  id uuid PRIMARY KEY,
  url text NOT NULL,
  score integer NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  retest_count integer DEFAULT 0,
  max_retests integer DEFAULT 3
);
CREATE INDEX reports_url_created_at_idx ON public.reports(url,created_at DESC);
CREATE INDEX reports_created_at_idx ON public.reports(created_at DESC);
CREATE INDEX reports_user_created_at_idx ON public.reports(user_id,created_at DESC);
CREATE TABLE public.scan_usage (
  client_key text NOT NULL,
  usage_date date NOT NULL,
  scan_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(client_key,usage_date)
);
CREATE INDEX scan_usage_date_idx ON public.scan_usage(usage_date DESC);
CREATE TABLE public.webhook_events (
  event_id text PRIMARY KEY,
  processed_at timestamptz DEFAULT now()
);
CREATE TABLE public.app_stats (
  key text PRIMARY KEY,
  value integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON public.app_stats FOR SELECT TO anon,authenticated USING (true);

-- Never rely on the host's automatic grants. Keep the database unexposed until
-- ALL manifest steps, including final permissions, pass verification.
REVOKE ALL ON public.profiles,public.reports,public.scan_usage,
  public.webhook_events,public.app_stats,public.contact_messages FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.profiles,public.reports,public.scan_usage,
  public.webhook_events,public.app_stats,public.contact_messages TO service_role;
COMMIT;
