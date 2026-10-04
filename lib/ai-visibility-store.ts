import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";
import type { Brand, EngineName, PromptResult, VisibilitySummary } from "@/lib/ai-visibility";

/**
 * Persistence for AI Visibility runs (table `ai_visibility_runs`, migration
 * 20261004_ai_visibility_runs.sql). Every function degrades gracefully when the table is not
 * migrated yet: saving returns false and listing returns an empty history.
 */

export type StoredRun = {
  id: string;
  brandName: string;
  domain: string;
  prompts: string[];
  engines: EngineName[];
  mentionRate: number;
  citationRate: number;
  checked: number;
  results: PromptResult[];
  createdAt: string;
};

type Row = {
  id: string;
  brand_name: string;
  domain: string;
  prompts: string[];
  engines: EngineName[];
  mention_rate: number;
  citation_rate: number;
  checked: number;
  results: PromptResult[];
  created_at: string;
};

export async function saveVisibilityRun(
  userId: string,
  brand: Brand,
  prompts: string[],
  engines: EngineName[],
  summary: VisibilitySummary
): Promise<boolean> {
  if (!hasSupabaseConfig()) return false;
  try {
    const res = await fetch(`${getSupabaseServerUrl()}/rest/v1/ai_visibility_runs`, {
      method: "POST",
      headers: { ...getSupabaseServiceHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: userId,
        brand_name: brand.name,
        domain: brand.domain,
        prompts,
        engines,
        mention_rate: summary.mentionRate,
        citation_rate: summary.citationRate,
        checked: summary.checked,
        results: summary.results,
      }),
    });
    if (!res.ok) {
      console.error("[ai-visibility] save failed with status", res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[ai-visibility] save failed:", err instanceof Error ? err.message : "unknown error");
    return false;
  }
}

/** Newest first. `domain` narrows to one brand; `limit` is capped at 50. */
export async function listVisibilityRuns(userId: string, domain?: string, limit = 20): Promise<StoredRun[]> {
  if (!hasSupabaseConfig()) return [];
  const filters = [`user_id=eq.${encodeURIComponent(userId)}`];
  if (domain) filters.push(`domain=eq.${encodeURIComponent(domain)}`);
  const capped = Math.min(Math.max(1, Math.floor(limit)), 50);
  try {
    const res = await fetch(
      `${getSupabaseServerUrl()}/rest/v1/ai_visibility_runs?${filters.join("&")}&order=created_at.desc&limit=${capped}`,
      { headers: getSupabaseServiceHeaders(), cache: "no-store" }
    );
    if (!res.ok) return []; // e.g. table not migrated yet
    const rows = (await res.json()) as Row[];
    return rows.map((r) => ({
      id: r.id,
      brandName: r.brand_name,
      domain: r.domain,
      prompts: r.prompts,
      engines: r.engines,
      mentionRate: r.mention_rate,
      citationRate: r.citation_rate,
      checked: r.checked,
      results: r.results,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}
