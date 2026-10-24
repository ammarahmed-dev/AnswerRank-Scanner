// Weekly AI visibility runs for tracked brands. Off unless AI_VISIBILITY_ENABLED=true; only Pro and
// Agency users' tracks run (limits in lib/ai-visibility-tracks.ts). Each track is due after 6 days,
// so a daily schedule spreads the work and a backlog never waits a whole week.

import { NextResponse } from "next/server";
import { getUserPlan } from "@/lib/auth-server";
import { availableEngines, runVisibilityCheck } from "@/lib/ai-visibility";
import { saveVisibilityRun } from "@/lib/ai-visibility-store";
import { listDueTracks, markTrackRun, pickEngines, trimPrompts } from "@/lib/ai-visibility-tracks";
import { runWithBudget } from "@/lib/batch";
import { hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";
export const maxDuration = 300;

const BUDGET_MS = 230_000;
const CONCURRENCY = 3;
const DUE_LIMIT = 40;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 401 });
  }

  if (process.env.AI_VISIBILITY_ENABLED !== "true") return NextResponse.json({ skipped: "disabled" });
  if (!hasSupabaseConfig()) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const engines = availableEngines();
  if (!engines.length) return NextResponse.json({ skipped: "no engines configured" });

  const tracks = await listDueTracks(DUE_LIMIT);
  const errors: string[] = [];
  let processed = 0;

  const { skipped } = await runWithBudget(
    tracks,
    async (track) => {
      try {
        const plan = await getUserPlan(track.userId);
        const planEngines = pickEngines(engines, plan);
        const prompts = trimPrompts(track.prompts, plan);
        if (!planEngines.length || !prompts.length) {
          // Plan lapsed or empty track: push it back a full interval so it cannot fill the due queue.
          await markTrackRun(track.id);
          return;
        }
        const brand = { name: track.brandName, domain: track.domain };
        const summary = await runVisibilityCheck(brand, prompts, planEngines);
        // An all-error run says nothing about the brand: keep the track due and retry next run.
        if (summary.checked === 0) {
          errors.push(`empty:${track.domain}`);
          return;
        }
        const saved = await saveVisibilityRun(track.userId, brand, prompts, planEngines.map((e) => e.name), summary);
        if (!saved) {
          errors.push(`save:${track.domain}`);
          return;
        }
        if (!(await markTrackRun(track.id))) {
          errors.push(`mark:${track.domain}`);
          return;
        }
        processed++;
      } catch (err) {
        console.error("[cron/ai-visibility] track failed:", err instanceof Error ? err.message : "unknown error");
        errors.push(`unexpected:${track.domain}`);
      }
    },
    { concurrency: CONCURRENCY, budgetMs: BUDGET_MS }
  );

  console.info(`[cron/ai-visibility] done - processed: ${processed}, errors: ${errors.length}, deferred: ${skipped}`);
  return NextResponse.json({ processed, errors, deferred: skipped });
}
