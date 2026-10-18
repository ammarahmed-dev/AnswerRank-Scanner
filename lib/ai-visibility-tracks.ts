import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";
import type { EngineName } from "@/lib/ai-visibility";

/**
 * Brands checked every week by `/api/cron/ai-visibility` (table `ai_visibility_tracks`, migration
 * 20261018_ai_visibility_tracks.sql). Every function degrades gracefully when the table is not
 * migrated yet: reads return an empty list and writes return false.
 */

export type Track = {
  id: string;
  userId: string;
  brandName: string;
  domain: string;
  prompts: string[];
  lastRunAt: string | null;
};

type Row = {
  id: string;
  user_id: string;
  brand_name: string;
  domain: string;
  prompts: string[];
  last_run_at: string | null;
};

/** Owner decision 2026-10-12: Pro 10 prompts on 2 engines, Agency 50. Other plans get no weekly runs. */
export const TRACK_LIMITS: Record<string, { prompts: number; engines: number } | undefined> = {
  pro: { prompts: 10, engines: 2 },
  agency: { prompts: 50, engines: 2 },
};

/** A track is due once 6 days have passed, so a daily-or-weekly cron never skips a week. */
export const TRACK_INTERVAL_MS = 6 * 24 * 60 * 60 * 1000;

export function pickEngines<T extends { name: EngineName }>(engines: T[], plan: string): T[] {
  const limit = TRACK_LIMITS[plan];
  return limit ? engines.slice(0, limit.engines) : [];
}

export function trimPrompts(prompts: string[], plan: string): string[] {
  const limit = TRACK_LIMITS[plan];
  return limit ? prompts.slice(0, limit.prompts) : [];
}

const toTrack = (r: Row): Track => ({
  id: r.id,
  userId: r.user_id,
  brandName: r.brand_name,
  domain: r.domain,
  prompts: r.prompts,
  lastRunAt: r.last_run_at,
});

/** Tracks never run or last run before the interval, most overdue first. */
export async function listDueTracks(limit = 40, now = Date.now()): Promise<Track[]> {
  if (!hasSupabaseConfig()) return [];
  const threshold = new Date(now - TRACK_INTERVAL_MS).toISOString();
  const params = new URLSearchParams({
    or: `(last_run_at.is.null,last_run_at.lt.${threshold})`,
    select: "id,user_id,brand_name,domain,prompts,last_run_at",
    order: "last_run_at.asc.nullsfirst",
    limit: String(limit),
  });
  try {
    const res = await fetch(`${getSupabaseServerUrl()}/rest/v1/ai_visibility_tracks?${params.toString()}`, {
      headers: getSupabaseServiceHeaders(),
      cache: "no-store",
    });
    if (!res.ok) return []; // e.g. table not migrated yet
    return ((await res.json()) as Row[]).map(toTrack);
  } catch {
    return [];
  }
}

export async function markTrackRun(id: string, at = new Date()): Promise<boolean> {
  if (!hasSupabaseConfig()) return false;
  try {
    const res = await fetch(`${getSupabaseServerUrl()}/rest/v1/ai_visibility_tracks?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { ...getSupabaseServiceHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify({ last_run_at: at.toISOString() }),
    });
    if (!res.ok) console.error("[ai-visibility] mark run failed with status", res.status);
    return res.ok;
  } catch {
    return false;
  }
}

/** Create or replace the track for (user, domain). */
export async function upsertTrack(userId: string, brand: { name: string; domain: string }, prompts: string[]): Promise<boolean> {
  if (!hasSupabaseConfig()) return false;
  try {
    const res = await fetch(`${getSupabaseServerUrl()}/rest/v1/ai_visibility_tracks?on_conflict=user_id,domain`, {
      method: "POST",
      headers: { ...getSupabaseServiceHeaders(), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ user_id: userId, brand_name: brand.name, domain: brand.domain, prompts }),
    });
    if (!res.ok) console.error("[ai-visibility] track save failed with status", res.status);
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteTrack(userId: string, domain: string): Promise<boolean> {
  if (!hasSupabaseConfig()) return false;
  try {
    const res = await fetch(
      `${getSupabaseServerUrl()}/rest/v1/ai_visibility_tracks?user_id=eq.${encodeURIComponent(userId)}&domain=eq.${encodeURIComponent(domain)}`,
      { method: "DELETE", headers: getSupabaseServiceHeaders() }
    );
    return res.ok;
  } catch {
    return false;
  }
}
