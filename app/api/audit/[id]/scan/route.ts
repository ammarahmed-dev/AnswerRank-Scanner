import { authUnavailableResponse } from "@/lib/auth-response";
import { AuditSaveConflict, saveAuditPageResult } from "@/lib/audit-persistence";
import { loadScanRows } from "@/lib/scan-resource";
import { BodyTooLargeError, readJsonObject } from "@/lib/bounded-body";
import type { ScoringMethodology } from "@/types/index";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { getSupabaseServerUrl, hasSupabaseConfig } from "@/lib/supabase-config";
import { runScanCore } from "@/lib/scan-core";
import { getNormalizedIssues } from "@/lib/report-issues";

export const runtime = "nodejs";
export const maxDuration = 60;

const supabaseUrl = getSupabaseServerUrl();
const SCAN_TIMEOUT_MS = 30000;

type RouteContext = { params: Promise<{ id: string }> };

export type AuditPageResult = {
  methodology?: ScoringMethodology;
  url: string;
  score: number;
  status?: "done" | "error";
  categoryScores: {
    schema?: number;
    metadata?: number;
    contentClarity?: number;
    performance?: number;
    trustSignals?: number;
    aiReadiness?: number;
    headings?: number;
  };
  issues: Array<{
    id: string;
    label: string;
    priority: "critical" | "high" | "medium" | "low";
    detail: string;
  }>;
  passingCount: number;
  criticalCount?: number;
  highCount?: number;
  niceCount?: number;
  topIssue?: string | null;
  error?: string;
  reportId?: string;
};

export async function POST(req: Request, ctx: RouteContext) {
  let persistenceStarted = false;
  try {
    const auth = await getAuthContext(req);
    const authUnavailable = authUnavailableResponse(auth);
    if (authUnavailable) return authUnavailable;
    if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasSupabaseConfig()) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

    const { id } = await ctx.params;

    let body: { url?: unknown };
    try {
      body = await readJsonObject(req);
    } catch (error) {
      return NextResponse.json({ error: error instanceof BodyTooLargeError ? "Request body is too large." : "Invalid request body." }, { status: error instanceof BodyTooLargeError ? 413 : 400 });
    }

    const pageUrl = typeof body?.url === "string" ? body.url.trim() : "";
    if (!pageUrl) return NextResponse.json({ error: "url is required." }, { status: 400 });

    req.signal.throwIfAborted();
    let auditRows: Array<{
      id: string; status: string; scanned_pages: number; total_pages: number;
      results: AuditPageResult[]; urls: string[];
    }>;
    try {
      auditRows = await loadScanRows(
        `${supabaseUrl}/rest/v1/audit_runs?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(auth.user.id)}&select=id,status,scanned_pages,total_pages,results,urls`,
        2_500_000, req.signal
      ) as typeof auditRows;
    } catch {
      return NextResponse.json({ error: req.signal.aborted ? "Request cancelled." : "Failed to load audit." }, { status: req.signal.aborted ? 499 : 503 });
    }
    req.signal.throwIfAborted();
    if (!auditRows.length) return NextResponse.json({ error: "Audit not found." }, { status: 404 });

    const audit = auditRows[0];
    if (audit.status === "completed" || audit.status === "failed") {
      return NextResponse.json({ error: "Audit is already finished." }, { status: 409 });
    }

    if (!Array.isArray(audit.urls) || !audit.urls.includes(pageUrl)) {
      return NextResponse.json({ error: "URL is not part of this audit." }, { status: 400 });
    }
    if (Array.isArray(audit.results) && audit.results.some((result) => result.url === pageUrl)) {
      return NextResponse.json({ error: "This page has already been scanned." }, { status: 409 });
    }

    const scanController = new AbortController();
    const scanSignal = AbortSignal.any([req.signal, scanController.signal]);
    let pageResult: AuditPageResult;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const scanPromise = runScanCore(pageUrl, { includePageSpeed: false, normalizeAndValidate: false, signal: scanSignal });
      const timeoutPromise = new Promise<never>((_, reject) =>
        timeout = setTimeout(() => { scanController.abort(); reject(new Error("timeout")); }, SCAN_TIMEOUT_MS)
      );
      const result = await Promise.race([scanPromise, timeoutPromise]);
      req.signal.throwIfAborted();

      const normalizedIssues = getNormalizedIssues(result.checks, result.pagespeed)
        .sort((a, b) => b.weight - a.weight);
      const topIssues = normalizedIssues.slice(0, 10);
      const passing = result.checks.filter((c) => c.status === "pass").length;

      pageResult = {
        url: pageUrl,
        score: result.score,
        status: "done",
        categoryScores: result.categoryScores,
        methodology: result.methodology,
        issues: topIssues.map((issue) => ({
          id: issue.id,
          label: issue.label,
          priority: issue.priority,
          detail: issue.detail,
        })),
        passingCount: passing,
        criticalCount: normalizedIssues.filter((i) => i.priority === "critical").length,
        highCount: normalizedIssues.filter((i) => i.priority === "high").length,
        niceCount: normalizedIssues.filter((i) => i.priority === "medium" || i.priority === "low").length,
        topIssue: topIssues[0]?.label ?? null,
      };
    } catch (err) {
      if (req.signal.aborted) return NextResponse.json({ error: "Request cancelled." }, { status: 499 });
      const isTimeout = scanController.signal.aborted || (err instanceof Error && err.message === "timeout");
      pageResult = {
        url: pageUrl,
        score: 0,
        status: "error",
        categoryScores: {},
        issues: [],
        passingCount: 0,
        criticalCount: 0,
        highCount: 0,
        niceCount: 0,
        topIssue: null,
        error: isTimeout ? "Page scan timed out." : "Scan failed.",
      };
    } finally {
      clearTimeout(timeout);
    }

    req.signal.throwIfAborted();

    // Let a dispatched transaction settle independently of caller cancellation.
    req.signal.throwIfAborted();
    persistenceStarted = true;
    try {
      const progress = await saveAuditPageResult(id, auth.user.id, pageResult);
      return NextResponse.json({ pageResult, ...progress });
    } catch (error) {
      if (error instanceof AuditSaveConflict) return NextResponse.json({ error: error.message }, { status: error.status });
      return NextResponse.json({ error: "Failed to save scan result. Reload the audit before retrying." }, { status: 503 });
    }
  } catch (err) {
    if (req.signal.aborted && !persistenceStarted) return NextResponse.json({ error: "Request cancelled." }, { status: 499 });
    console.error("[audit scan] Unhandled error:", err instanceof Error ? err.name : "Unknown error");
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
