import { NextResponse } from "next/server";
import { runScanCore } from "@/lib/scan-core";
import { normalizeUrl, validateUrl } from "@/lib/scrape";
import { getAuthContext } from "@/lib/auth-server";
import { getClientKey, getPlanLimit, checkUsageLimit, incrementUsage } from "@/lib/usage-limits";
import { isMasterAdmin } from "@/lib/admin";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";
import type { CheckResult } from "@/types/index";

const supabaseUrl = getSupabaseServerUrl();

export const runtime = "nodejs";

type CompareBody = {
  urls?: string[];
  primaryUrl?: string;
  competitorUrl?: string;
};

function checkValue(checks: CheckResult[], id: string) {
  const status = checks.find((check) => check.id === id)?.status;
  if (status === "pass") return 100;
  if (status === "warn") return 60;
  return 20;
}

function avg(values: number[]) {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function benchmarkMetrics(checks: CheckResult[], score: number) {
  return {
    overall: score,
    entity: avg([checkValue(checks, "title"), checkValue(checks, "meta_desc"), checkValue(checks, "h1")]),
    schema: avg([checkValue(checks, "schema_present"), checkValue(checks, "faq_schema")]),
    proof: avg([checkValue(checks, "word_count"), checkValue(checks, "alt_text"), checkValue(checks, "internal_links")]),
  };
}

type Winner = "primary" | "competitor" | "tie";
type Impact = "high" | "medium" | "low";

function winnerFromGap(gap: number): Winner {
  if (gap > 0) return "primary";
  if (gap < 0) return "competitor";
  return "tie";
}

function impactFromAbsGap(absGap: number): Impact {
  if (absGap >= 15) return "high";
  if (absGap >= 7) return "medium";
  return "low";
}

function toNumericOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toLabel(category: string): string {
  if (category === "aiReadiness") return "AI Readiness";
  if (category === "contentClarity") return "Content Clarity";
  if (category === "trustSignals") return "Trust Signals";
  if (category === "core_web_vitals") return "Performance";
  if (category === "performance") return "Performance";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function domainFromUrl(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./i, "");
  } catch {
    return rawUrl;
  }
}

export async function POST(req: Request) {
  const auth = await getAuthContext(req);
  const isAdmin = auth.user ? isMasterAdmin(auth.user.email) : false;
  const effectivePlan = isAdmin ? "agency" : auth.plan;
  const clientKey = auth.user
    ? `compare:user:${auth.user.id}`
    : `compare:${getClientKey(undefined, req)}`;
  const bypassLimit = isAdmin;
  const usage = bypassLimit
    ? { allowed: true, count: 0, remaining: Number.MAX_SAFE_INTEGER, limit: Number.MAX_SAFE_INTEGER }
    : await checkUsageLimit(clientKey, getPlanLimit(effectivePlan));
  if (!usage.allowed) {
    return NextResponse.json(
      { error: "Compare limit reached for this month.", limit: usage.limit, remaining: 0 },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as CompareBody;
  const candidatePrimary = typeof body.primaryUrl === "string" ? body.primaryUrl.trim() : "";
  const candidateCompetitor = typeof body.competitorUrl === "string" ? body.competitorUrl.trim() : "";
  const urlsFromArray = (body.urls ?? []).map((url) => url.trim()).filter(Boolean);

  const primaryInput = candidatePrimary || urlsFromArray[0] || "";
  const competitorInput = candidateCompetitor || urlsFromArray[1] || "";

  if (!primaryInput || !competitorInput) {
    return NextResponse.json(
      { error: "Please provide both primaryUrl and competitorUrl as public website URLs." },
      { status: 400 }
    );
  }

  let primaryUrl = "";
  let competitorUrl = "";
  try {
    primaryUrl = normalizeUrl(primaryInput);
    competitorUrl = normalizeUrl(competitorInput);
  } catch {
    return NextResponse.json(
      { error: "One or more URLs are invalid. Please use full public website URLs like https://example.com." },
      { status: 400 }
    );
  }
  if (!validateUrl(primaryUrl) || !validateUrl(competitorUrl)) {
    return NextResponse.json({ error: "Both URLs must be valid public http(s) URLs." }, { status: 400 });
  }
  if (primaryUrl === competitorUrl) {
    return NextResponse.json({ error: "Please provide two different URLs for comparison." }, { status: 400 });
  }

  try {
    const [primaryCore, competitorCore] = await Promise.all([runScanCore(primaryUrl, {
      includePageSpeed: true,
      normalizeAndValidate: false,
    }), runScanCore(competitorUrl, {
      includePageSpeed: true,
      normalizeAndValidate: false,
    })]);

    const results = [
      {
        url: primaryUrl,
        score: primaryCore.score,
        metrics: benchmarkMetrics(primaryCore.checks, primaryCore.score),
      },
      {
        url: competitorUrl,
        score: competitorCore.score,
        metrics: benchmarkMetrics(competitorCore.checks, competitorCore.score),
      },
    ];

    const categoryKeys = ["metadata", "headings", "schema", "contentClarity", "aiReadiness", "trustSignals", "performance"] as const;
    const categoryBreakdown = categoryKeys.flatMap((category) => {
      const p = toNumericOrNull(primaryCore.categoryScores[category]);
      const c = toNumericOrNull(competitorCore.categoryScores[category]);
      if (p === null && c === null) {
        return [{
          category,
          primaryScore: null,
          competitorScore: null,
          gap: null,
          winner: "tie" as const,
        }];
      }
      const gap = p !== null && c !== null ? p - c : null;
      return [{
        category,
        primaryScore: p,
        competitorScore: c,
        gap,
        winner: gap === null ? "tie" : winnerFromGap(gap),
      }];
    });

    const advantages = categoryBreakdown
      .filter((item) => typeof item.gap === "number" && item.gap > 0)
      .map((item) => ({
        title: `${toLabel(item.category)} advantage`,
        description: `Primary leads by ${item.gap as number} points in ${toLabel(item.category)}.`,
        category: item.category,
        impact: impactFromAbsGap(Math.abs(item.gap as number)),
      }));

    const gaps = categoryBreakdown
      .filter((item) => typeof item.gap === "number" && item.gap < 0)
      .map((item) => ({
        title: `${toLabel(item.category)} gap`,
        description: `Competitor leads by ${Math.abs(item.gap as number)} points in ${toLabel(item.category)}.`,
        category: item.category,
        impact: impactFromAbsGap(Math.abs(item.gap as number)),
      }));

    const primaryScore = primaryCore.score;
    const competitorScore = competitorCore.score;
    const scoreGap = primaryScore - competitorScore;
    const winner = winnerFromGap(scoreGap);
    const competitorDomain = domainFromUrl(competitorUrl);
    const summary =
      winner === "tie"
        ? "Both sites have the same AI search readiness score."
        : winner === "primary"
          ? `Your site is ${scoreGap} points ahead of ${competitorDomain}.`
          : `Your site is ${Math.abs(scoreGap)} points behind ${competitorDomain}.`;

    if (!bypassLimit) await incrementUsage(clientKey, usage.count + 1);

    if (auth.user && (effectivePlan === "pro" || effectivePlan === "agency") && hasSupabaseConfig()) {
      fetch(`${supabaseUrl}/rest/v1/compare_runs`, {
        method: "POST",
        headers: {
          ...getSupabaseServiceHeaders(),
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          user_id: auth.user.id,
          url_a: primaryUrl,
          url_b: competitorUrl,
          score_a: primaryScore,
          score_b: competitorScore,
        }),
      }).catch(() => {});
    }

    return NextResponse.json({
      competitors: results,
      comparison: {
        primaryScore,
        competitorScore,
        scoreGap,
        winner,
        categoryBreakdown,
        advantages,
        gaps,
        summary,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Comparison failed. Please make sure both URLs are publicly accessible and try again." },
      { status: 500 }
    );
  }
}
