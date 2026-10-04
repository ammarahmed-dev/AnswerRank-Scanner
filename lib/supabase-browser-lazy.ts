"use client";

// Loads the Supabase browser client on demand. Modules on the homepage and shared layout import
// this file instead of `supabase-browser.ts`, so supabase-js (incl. Realtime) is split into its own
// chunk and fetched after first paint instead of blocking hydration. Both paths share the same
// client singleton, so sessions stay in sync with pages that import `supabase-browser.ts` directly.
import type { SupabaseClient } from "@supabase/supabase-js";

export const supabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function loadSupabaseBrowserClient(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return null;
  const { getSupabaseBrowserClient } = await import("./supabase-browser");
  return getSupabaseBrowserClient();
}

/** Current access token for API calls, or null for guests. */
export async function getBrowserAccessToken(): Promise<string | null> {
  if (!supabaseConfigured) return null;
  const { getSupabaseBrowserClient, getSafeSupabaseSession } = await import("./supabase-browser");
  return (await getSafeSupabaseSession(getSupabaseBrowserClient()))?.access_token ?? null;
}
