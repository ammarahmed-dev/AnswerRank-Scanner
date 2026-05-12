create table if not exists public.reports (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  url text not null,
  score integer not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.reports
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists reports_url_created_at_idx
  on public.reports (url, created_at desc);

create index if not exists reports_created_at_idx
  on public.reports (created_at desc);

create index if not exists reports_user_created_at_idx
  on public.reports (user_id, created_at desc);

alter table public.reports enable row level security;

-- Reports are read and written only from Next.js API routes using the
-- server-side service role key. Do not add public anon policies unless
-- you intentionally want direct browser access to report rows.
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.reports to service_role;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'agency')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

grant select, insert, update, delete on table public.profiles to service_role;

create table if not exists public.scan_usage (
  client_key text not null,
  usage_date date not null,
  scan_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (client_key, usage_date)
);

create index if not exists scan_usage_date_idx
  on public.scan_usage (usage_date desc);

alter table public.scan_usage enable row level security;

grant select, insert, update, delete on table public.scan_usage to service_role;

