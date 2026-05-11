-- Run this SQL in Supabase SQL Editor before using the waitlist form.

create extension if not exists pgcrypto;

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'agency_early_access',
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_email_source_key
  on public.waitlist (lower(email), source);

alter table public.waitlist enable row level security;

drop policy if exists "waitlist_insert_anon_auth" on public.waitlist;
create policy "waitlist_insert_anon_auth"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (true);
