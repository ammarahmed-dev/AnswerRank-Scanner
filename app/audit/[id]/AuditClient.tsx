﻿"use client";

import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, ChevronDown, Download, ExternalLink, LayoutGrid, Loader2 } from "lucide-react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import ScoreCircle from "../../components/ScoreCircle";
import UpgradeButton from "../../components/UpgradeButton";
import { useAuth } from "../../context/AuthContext";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuditPageResult = {
  url: string;
  score: number;
  categoryScores: {
    schema?: number;
    metadata?: number;
    contentClarity?: number;
    performance?: number;
    trustSignals?: number;
    aiReadiness?: number;
    headings?: number;
  };
  issues?: Array<{
    id: string;
    label: string;
    priority?: "critical" | "high" | "medium" | "low";
    detail?: string;
  }>;
  passing?: number;
  criticalCount?: number;
  highCount?: number;
  niceCount?: number;
  topIssue?: string | null;
  error?: string;
  reportId?: string;
};
type IssueSeverity = "critical" | "high" | "nice";

type AuditRun = {
  id: string;
  domain: string;
  status: string;
  total_pages: number;
  scanned_pages: number;
  aggregate_score: number | null;
  page_limit: number;
  total_discovered?: number;
  urls: string[];
  results: AuditPageResult[];
  created_at: string;
  completed_at: string | null;
};

type SortOrder = "asc" | "desc" | "discovery";

const CATEGORY_LABELS: Record<string, string> = {
  schema: "Schema",
  metadata: "Metadata",
  contentClarity: "Content Clarity",
  performance: "Performance",
  trustSignals: "Trust Signals",
  aiReadiness: "AI Readiness",
  headings: "Headings",
};

const CATEGORY_ORDER = [
  "schema",
  "metadata",
  "contentClarity",
  "performance",
  "trustSignals",
  "aiReadiness",
  "headings",
] as const;

const FIX_VERBS: Record<string, string> = {
  faq_schema: "Adding FAQPage schema",
  schema_present: "Adding JSON-LD schema markup",
  llms_txt: "Creating an llms.txt file",
  robots: "Fixing robots.txt",
  sitemap: "Adding a sitemap.xml",
  title: "Optimizing page titles",
  meta_desc: "Writing meta descriptions",
  og_tags: "Adding Open Graph tags",
  canonical: "Adding canonical tags",
  heading_structure: "Fixing heading structure",
  breadcrumb_schema: "Adding Breadcrumb schema",
  eeat_author: "Adding author attribution",
  eeat_about: "Adding About/Contact pages",
  eeat_freshness: "Adding publication dates",
};

function fixVerb(id: string, label: string): string {
  return FIX_VERBS[id] ?? `Fixing "${label}"`;
}

function statusLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Needs Work";
  return "Poor";
}

type ScoreGrade = "excellent" | "strong" | "medium" | "poor";

function scoreGrade(score: number): ScoreGrade {
  if (score >= 85) return "excellent";
  if (score >= 70) return "strong";
  if (score >= 50) return "medium";
  return "poor";
}

function scoreAccentColor(score: number): string {
  if (score >= 85) return "#00d68f";
  if (score >= 70) return "#00f0b4";
  if (score >= 50) return "#ffb830";
  return "#ff4d6a";
}

function categoryNote(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Needs Work";
  return "Poor";
}

function toIssueSeverity(priority?: "critical" | "high" | "medium" | "low"): IssueSeverity {
  if (priority === "critical") return "critical";
  if (priority === "high") return "high";
  return "nice";
}

function severityLabel(severity: IssueSeverity): string {
  if (severity === "critical") return "Critical";
  if (severity === "high") return "High";
  return "Nice to Have";
}

function severityBadgeClass(severity: IssueSeverity): string {
  if (severity === "critical") return "badge-critical";
  if (severity === "high") return "badge-high";
  return "badge-low";
}

function normalizePageIssues(result: AuditPageResult): Array<{
  id: string;
  label: string;
  priority: "critical" | "high" | "medium" | "low";
  detail: string;
}> {
  if (!result.issues || result.issues.length === 0) return [];
  return result.issues.map((issue) => ({
    id: issue.id,
    label: issue.label,
    priority: issue.priority ?? "high",
    detail: issue.detail ?? issue.label,
  }));
}

function hasIssuesData(result: AuditPageResult): boolean {
  return Array.isArray(result.issues);
}

function barColor(score: number): string {
  if (score >= 90) return "#00d68f";
  if (score >= 70) return "#00f0b4";
  if (score >= 50) return "#ffb830";
  return "#ff4d6a";
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function getPageNote(url: string): string | null {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    if (/\.(webmanifest|xml|json|txt|pdf|svg|ico|png|jpg|jpeg|gif|css|js)$/.test(path)) {
      return "Skipped - not a webpage";
    }
    if (/^\/(login|signup|register|auth)/.test(path)) {
      return "Auth page - low scores expected";
    }
  } catch {
    // ignore
  }
  return null;
}

const SCAN_DELAY_MS = 500;
const SECS_PER_PAGE = 8;

export default function AuditClient() {
  const params = useParams<{ id: string }>();
  const auditId = params?.id ?? "";
  const router = useRouter();
  const { user, plan, loading: authLoading } = useAuth();
  const supabase = getSupabaseBrowserClient();

  const [audit, setAudit] = useState<AuditRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const [urlFilter, setUrlFilter] = useState("");
  const [currentScanUrl, setCurrentScanUrl] = useState<string | null>(null);
  const scanningRef = useRef(false);
  const mainRef = useRef<HTMLElement>(null);

  async function getToken() {
    return (await getSafeSupabaseSession(supabase))?.access_token ?? null;
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(`/login?next=/audit/${auditId}`);
      return;
    }
    let active = true;

    async function loadAudit() {
      const token = await getToken();
      if (!token) { router.replace(`/login?next=/audit/${auditId}`); return; }

      const res = await fetch(`/api/audit/${auditId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!active) return;
      if (!res.ok) {
        setError("Audit not found or you don't have access.");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as AuditRun;
      setAudit(data);
      setLoading(false);
      if (data.status !== "completed" && data.status !== "failed" && !scanningRef.current) {
        startScanLoop(data, token);
      }
    }

    loadAudit();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, auditId]);

  async function startScanLoop(initialAudit: AuditRun, token: string) {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setScanning(true);

    const scannedUrls = new Set((initialAudit.results ?? []).map((r) => r.url));
    const pendingUrls = (initialAudit.urls ?? []).filter((u) => !scannedUrls.has(u));

    for (const url of pendingUrls) {
      await new Promise((r) => setTimeout(r, SCAN_DELAY_MS));
      setCurrentScanUrl(url);

      try {
        const res = await fetch(`/api/audit/${initialAudit.id}/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ url }),
        });
        if (!res.ok) continue;

        const data = (await res.json()) as {
          pageResult: AuditPageResult;
          scannedPages: number;
          totalPages: number;
          aggregateScore: number | null;
          complete: boolean;
        };

        setAudit((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            results: [...prev.results, data.pageResult],
            scanned_pages: data.scannedPages,
            aggregate_score: data.aggregateScore,
            status: data.complete ? "completed" : "running",
            completed_at: data.complete ? new Date().toISOString() : null,
          };
        });
        if (data.complete) break;
      } catch {
        // continue on network error
      }
    }

    setCurrentScanUrl(null);
    scanningRef.current = false;
    setScanning(false);
  }

  function handleDownloadPdf() {
    document.body.classList.add("pdf-export-mode");
    mainRef.current?.classList.add("audit-printing");
    window.print();
    setTimeout(() => {
      mainRef.current?.classList.remove("audit-printing");
      document.body.classList.remove("pdf-export-mode");
    }, 100);
  }

  const isRunning = (audit?.status === "running" || audit?.status === "pending" || scanning) ?? false;

  const progressPercent = useMemo(() => {
    if (!audit || audit.total_pages === 0) return 0;
    return Math.round((audit.scanned_pages / audit.total_pages) * 100);
  }, [audit]);

  const eta = useMemo(() => {
    if (!isRunning || !audit) return null;
    const remaining = audit.total_pages - audit.scanned_pages;
    if (remaining <= 0) return null;
    const secs = remaining * SECS_PER_PAGE;
    if (secs < 60) return `~${secs}s`;
    return `~${Math.ceil(secs / 60)}m`;
  }, [isRunning, audit]);

  const avgCategoryScores = useMemo(() => {
    if (!audit || audit.results.length === 0) return null;
    const totals: Record<string, { sum: number; count: number }> = {};
    for (const r of audit.results) {
      if (r.error) continue;
      for (const key of CATEGORY_ORDER) {
        const val = r.categoryScores[key];
        if (typeof val !== "number") continue;
        if (!totals[key]) totals[key] = { sum: 0, count: 0 };
        totals[key].sum += val;
        totals[key].count += 1;
      }
    }
    const result: Partial<Record<string, number>> = {};
    for (const [key, { sum, count }] of Object.entries(totals)) {
      result[key] = Math.round(sum / count);
    }
    return result;
  }, [audit]);

  const { bestCat, worstCat } = useMemo(() => {
    if (!avgCategoryScores) return { bestCat: null, worstCat: null };
    let best: { key: string; score: number } | null = null;
    let worst: { key: string; score: number } | null = null;
    for (const [key, score] of Object.entries(avgCategoryScores)) {
      if (typeof score !== "number") continue;
      if (!best || score > best.score) best = { key, score };
      if (!worst || score < worst.score) worst = { key, score };
    }
    return { bestCat: best, worstCat: worst };
  }, [avgCategoryScores]);

  const pageCount = audit?.results.filter((r) => !r.error).length ?? 0;

  const siteWideIssues = useMemo(() => {
    if (!audit || audit.results.length === 0) return [];
    const issueCounts = new Map<string, { label: string; priority: "critical" | "high" | "medium" | "low"; count: number }>();
    for (const r of audit.results) {
      if (r.error) continue;
      const issues = normalizePageIssues(r);
      for (const issue of issues) {
        const entry = issueCounts.get(issue.id);
        if (entry) {
          entry.count += 1;
        } else {
          issueCounts.set(issue.id, { label: issue.label, priority: issue.priority, count: 1 });
        }
      }
    }

    return Array.from(issueCounts.entries())
      .map(([id, value]) => ({ id, ...value }))
      .filter((e) => e.count >= 3)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((issue) => ({ ...issue, severity: toIssueSeverity(issue.priority) }));
  }, [audit]);

  const sortedResults = useMemo(() => {
    if (!audit) return [];
    if (sortOrder === "discovery") return [...audit.results];
    return [...audit.results].sort((a, b) => {
      const sa = a.error ? -1 : a.score;
      const sb = b.error ? -1 : b.score;
      return sortOrder === "asc" ? sa - sb : sb - sa;
    });
  }, [audit, sortOrder]);

  const filteredResults = useMemo(() => {
    if (!urlFilter.trim()) return sortedResults;
    const q = urlFilter.toLowerCase();
    return sortedResults.filter((r) => r.url.toLowerCase().includes(q));
  }, [sortedResults, urlFilter]);

  const scoreDistribution = useMemo(() => {
    const nonError = filteredResults.filter((r) => !r.error);
    const total = nonError.length;
    return {
      excellent: nonError.filter((r) => r.score >= 90).length,
      strong: nonError.filter((r) => r.score >= 70 && r.score < 90).length,
      needsWork: nonError.filter((r) => r.score >= 50 && r.score < 70).length,
      poor: nonError.filter((r) => r.score < 50).length,
      total,
    };
  }, [filteredResults]);

  if (loading || authLoading) {
    return (
      <main className="min-h-screen">
        <SiteHeader />
        <div className="page-loading">
          <div className="page-loading-spinner" />
          <span>Loading audit</span>
        </div>
        <SiteFooter />
      </main>
    );
  }

  if (error || !audit) {
    return (
      <main className="min-h-screen">
        <SiteHeader />
        <section className="audit-page app-container">
          <div className="error-banner">
            <AlertCircle className="h-5 w-5" />
            <div>
              <strong>Audit unavailable</strong>
              <p>{error || "Audit not found."}</p>
            </div>
            <Link href="/audit" className="btn btn-secondary">Back to audits</Link>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const aggregateScore = audit.aggregate_score;
  const hasPdfAccess = plan === "onetime" || plan === "pro" || plan === "agency";

  return (
    <main ref={mainRef} className="min-h-screen">
      <SiteHeader />

      <section className="audit-page app-container">
        <div className="audit-page-topbar">
          <Link href="/audit" className="btn btn-secondary">All audits</Link>
          <Link href="/dashboard" className="btn btn-secondary">Dashboard</Link>
          {audit.status === "completed" && (
            hasPdfAccess ? (
              <button onClick={handleDownloadPdf} className="btn btn-secondary audit-pdf-btn-top">
                <Download className="h-4 w-4" />
                Export PDF
              </button>
            ) : (
              <button
                className="btn btn-secondary audit-pdf-btn-top"
                disabled
                title="Upgrade to download PDF"
                style={{ opacity: 0.5, cursor: "not-allowed" }}
              >
                <Download className="h-4 w-4" />
                Export PDF
              </button>
            )
          )}
        </div>

        {/* â"€â"€ Scanning progress banner â"€â"€ */}
        {isRunning && (
          <>
            <div className="audit-scan-banner">
              <div className="audit-scan-progress-track">
                <div
                  className="audit-scan-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="audit-scan-info">
                <div className="audit-scan-info-main">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <strong>Scanning page {audit.scanned_pages + 1} of {audit.total_pages}</strong>
                  {eta && <span className="muted-copy">- {eta} remaining</span>}
                </div>
                {currentScanUrl && (
                  <p className="muted-copy audit-scan-url">{currentScanUrl}</p>
                )}
              </div>
            </div>
            <div className="surface report-card audit-progress-card">
              <p className="audit-progress-title">Scanning page {audit.scanned_pages + 1} of {audit.total_pages}</p>
              {currentScanUrl && <p className="audit-progress-url">{currentScanUrl}</p>}
            </div>
          </>
        )}

        {/* â"€â"€ Hero â"€â"€ */}
        <section className="surface report-hero audit-report-hero print-section">
          <div className="report-hero-grid audit-hero-grid">
            {aggregateScore != null ? (
              <div className="audit-score-accent-wrap" style={{ "--audit-score-accent": scoreAccentColor(aggregateScore) } as CSSProperties}>
                <ScoreCircle score={aggregateScore} />
              </div>
            ) : (
              <div className="score-widget">
                <div className="score-ring score-ring-pending-audit">
                  <div className="score-core">
                    <span>-</span>
                    <small>{isRunning ? "Scanning" : "Pending"}</small>
                  </div>
                </div>
                <div className="score-grade-badge">
                  <span className="text-amber-300">{isRunning ? "In Progress" : "Pending"}</span>
                </div>
              </div>
            )}

            <div className="audit-hero-copy">
              <div className="report-hero-badges">
                <span className="badge">
                  <LayoutGrid className="h-3 w-3" style={{ display: "inline", marginRight: 4 }} />
                  Site Audit
                </span>
                {aggregateScore != null && <span className="badge">{statusLabel(aggregateScore)}</span>}
                <span className="badge">{isRunning ? "Scanning..." : audit.status === "completed" ? "Complete" : "Pending"}</span>
              </div>

              <h1 className="report-title">{audit.domain}</h1>
              <p className="audit-hero-meta muted-copy">Started {formatDate(audit.created_at)}</p>

              <div className="audit-hero-stats">
                <div className="audit-hero-stat">
                  <strong>{audit.scanned_pages}</strong>
                  <span>Pages scanned</span>
                </div>
                <div className="audit-hero-stat">
                  <strong>{audit.total_discovered ?? audit.total_pages}</strong>
                  <span>Total pages</span>
                </div>
                <div className="audit-hero-stat">
                  <strong>{aggregateScore != null ? `${aggregateScore}/100` : "-"}</strong>
                  <span>AEO score</span>
                </div>
                <div className="audit-hero-stat">
                  <strong>{audit.status === "completed" ? "Done" : isRunning ? "Running" : "Pending"}</strong>
                  <span>Status</span>
                </div>
              </div>

              {(bestCat || worstCat) && (
                <div className="insights-list audit-hero-insights">
                  {bestCat && (
                    <article className="insight-card">
                      <div className="insight-card-head">
                        <span>Strongest area</span>
                      </div>
                      <p>{CATEGORY_LABELS[bestCat.key] ?? bestCat.key} - avg {bestCat.score}/100</p>
                    </article>
                  )}
                  {worstCat && worstCat.key !== bestCat?.key && (
                    <article className="insight-card">
                      <div className="insight-card-head">
                        <span>Needs most work</span>
                      </div>
                      <p>{CATEGORY_LABELS[worstCat.key] ?? worstCat.key} - avg {worstCat.score}/100</p>
                    </article>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* â"€â"€ Category score breakdown â"€â"€ */}
        {avgCategoryScores && Object.keys(avgCategoryScores).length > 0 && (
          <section className="surface report-card print-section">
            <h3 className="section-heading">Score Breakdown</h3>
            <p className="section-kicker mt-1">
              Site averages across {pageCount} {pageCount === 1 ? "page" : "pages"}.
            </p>
            <div className="score-breakdown-grid mt-4">
              {CATEGORY_ORDER.filter((k) => typeof avgCategoryScores[k] === "number").map((k) => {
                const score = avgCategoryScores[k]!;
                return (
                  <div key={k} className={`score-breakdown-card${score < 70 ? " score-breakdown-card--warning" : ""}`}>
                    <div className="score-breakdown-head">
                      <span>{CATEGORY_LABELS[k]}</span>
                      <strong>{score}</strong>
                    </div>
                    <div className="score-bar">
                      <span
                        className="score-bar-fill"
                        style={{ width: `${score}%`, background: barColor(score) } as CSSProperties}
                      />
                    </div>
                    <small>{categoryNote(score)}</small>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* â"€â"€ Site-wide patterns â"€â"€ */}
        <section className="surface report-card print-section">
          <h3 className="section-heading">Site-wide Patterns</h3>
          <p className="section-kicker mt-1">Issues appearing across multiple pages.</p>

          {siteWideIssues.length === 0 ? (
            <div className="audit-patterns-empty">
              <p className="muted-copy">No recurring issues found across pages.</p>
            </div>
          ) : (
            <>
              <div className="audit-quick-wins-section mt-4">
                <p className="audit-quick-wins-label">Quick wins</p>
                <div className="audit-quick-wins-list">
                  {siteWideIssues.slice(0, 3).map((win) => (
                    <div key={win.id} className="audit-quick-win-row">
                      <span className="audit-quick-win-dot" />
                      <span>
                        <strong>{fixVerb(win.id, win.label)}</strong>
                        {" "}would improve{" "}
                        <strong>{win.count}</strong> of <strong>{pageCount}</strong> pages
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="audit-patterns-grid mt-4">
                {siteWideIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`audit-pattern-card audit-pattern-card--${issue.severity}`}
                  >
                    <div className="audit-pattern-head">
                      <AlertCircle className="h-4 w-4 audit-pattern-icon" />
                      <span className="audit-pattern-label">
                        {issue.label} - affects {issue.count} of {pageCount} pages
                      </span>
                      <em className={`mini-pill ${severityBadgeClass(issue.severity)}`}>
                        {severityLabel(issue.severity)}
                      </em>
                    </div>
                    <p className="audit-pattern-subtext">
                      Repeats across multiple pages and is reducing overall audit score consistency.
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* â"€â"€ Page results â"€â"€ */}
        {audit.results.length > 0 && (
          <section className="surface report-card audit-results-section">
            <div className="audit-results-header">
              <div>
                <h3 className="section-heading">Page Results</h3>
                <p className="section-kicker mt-1">Per-page breakdown - click any row to see top issues.</p>
              </div>
            </div>

            {/* Page limit CTA */}
            {audit.status === "completed" && audit.page_limit > 0 && audit.scanned_pages >= audit.page_limit && (
              <div className="audit-limit-cta">
                <div className="audit-limit-cta-body">
                  <span className="badge eyebrow audit-limit-cta-eyebrow">Plan limit reached</span>
                  <h3 className="audit-limit-cta-heading">
                    Scanned {audit.page_limit} of {audit.total_discovered ? `${audit.total_discovered}+` : `${audit.page_limit}+`} pages
                  </h3>
                  <p className="audit-limit-cta-desc">
                    Your plan covers {audit.page_limit} pages per audit. Upgrade to Pro for deeper site coverage and catch more visibility issues across your pages.
                  </p>
                  <ul className="audit-limit-cta-features">
                    <li><CheckCircle2 className="audit-limit-check-icon" />Up to 100 pages per audit</li>
                    <li><CheckCircle2 className="audit-limit-check-icon" />Re-audit any time, on demand</li>
                    <li><CheckCircle2 className="audit-limit-check-icon" />10 monitored URLs included</li>
                  </ul>
                </div>
                <div className="audit-limit-cta-action">
                  <p className="audit-limit-cta-action-label">Pro Plan</p>
                  <UpgradeButton plan="pro" className="btn btn-primary audit-limit-cta-btn">Upgrade to Pro →</UpgradeButton>
                  <p className="audit-limit-cta-hint">
                    Or re-run with <em>{audit.domain}/blog</em> to audit a specific section.
                  </p>
                </div>
              </div>
            )}

            {/* Sticky sort + filter bar */}
            <div className="audit-sticky-bar">
              <div className="audit-sort-row">
                {(["asc", "desc", "discovery"] as SortOrder[]).map((o) => {
                  const label = o === "asc" ? "Worst first" : o === "desc" ? "Best first" : "Discovery order";
                  return (
                    <button
                      key={o}
                      className={`audit-sort-pill${sortOrder === o ? " active" : ""}`}
                      onClick={() => setSortOrder(o)}
                      type="button"
                    >
                      {label}
                    </button>
                  );
                })}
                <span className="muted-copy audit-sort-count">
                  {urlFilter.trim()
                    ? `Showing ${filteredResults.length} of ${sortedResults.length} pages`
                    : `${sortedResults.length} pages`}
                </span>
              </div>

              <div className="audit-filter-row">
                <input
                  type="text"
                  className="audit-filter-input"
                  placeholder="Filter pages by URL..."
                  value={urlFilter}
                  onChange={(e) => setUrlFilter(e.target.value)}
                />
              </div>
            </div>

            {/* Score distribution bar */}
            {scoreDistribution.total > 0 && (
              <div className="audit-score-dist">
                <div className="audit-score-dist-bar">
                  {scoreDistribution.excellent > 0 && (
                    <div
                      className="audit-score-dist-seg audit-score-dist-seg--excellent"
                      style={{ width: `${(scoreDistribution.excellent / scoreDistribution.total) * 100}%` }}
                    />
                  )}
                  {scoreDistribution.strong > 0 && (
                    <div
                      className="audit-score-dist-seg audit-score-dist-seg--strong"
                      style={{ width: `${(scoreDistribution.strong / scoreDistribution.total) * 100}%` }}
                    />
                  )}
                  {scoreDistribution.needsWork > 0 && (
                    <div
                      className="audit-score-dist-seg audit-score-dist-seg--needs"
                      style={{ width: `${(scoreDistribution.needsWork / scoreDistribution.total) * 100}%` }}
                    />
                  )}
                  {scoreDistribution.poor > 0 && (
                    <div
                      className="audit-score-dist-seg audit-score-dist-seg--poor"
                      style={{ width: `${(scoreDistribution.poor / scoreDistribution.total) * 100}%` }}
                    />
                  )}
                </div>
                <div className="audit-score-dist-labels">
                  {[
                    scoreDistribution.excellent > 0 && { key: "excellent", label: "Excellent", count: scoreDistribution.excellent },
                    scoreDistribution.strong > 0 && { key: "strong", label: "Strong", count: scoreDistribution.strong },
                    scoreDistribution.needsWork > 0 && { key: "needs", label: "Needs Work", count: scoreDistribution.needsWork },
                    scoreDistribution.poor > 0 && { key: "poor", label: "Poor", count: scoreDistribution.poor },
                  ]
                    .filter(Boolean)
                    .map((bucket, idx, arr) => (
                      <span key={(bucket as { key: string }).key} className="audit-score-dist-label">
                        <span className={`audit-score-dist-dot audit-score-dist-dot--${(bucket as { key: string }).key}`} />
                        {(bucket as { label: string; count: number }).label} {(bucket as { count: number }).count}
                        {idx < arr.length - 1 && <span style={{ margin: "0 2px", opacity: 0.5 }}> · </span>}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Page cards */}
            <div className="audit-page-list">
              {filteredResults.map((r) => {
                const isOpen = expandedUrl === r.url;
                const note = getPageNote(r.url);
                const pageIssues = normalizePageIssues(r);
                const criticalCount = pageIssues.filter((i) => i.priority === "critical").length;
                const highCount = pageIssues.filter((i) => i.priority === "high").length;
                const grade = statusLabel(r.score);
                return (
                  <article
                    key={r.url}
                    className={`audit-page-card${isOpen ? " is-open" : ""}${r.error ? " has-error" : ""}`}
                  >
                    <button
                      className="audit-page-card-toggle"
                      onClick={() => setExpandedUrl(isOpen ? null : r.url)}
                      type="button"
                      aria-expanded={isOpen}
                    >
                      {/* Score bubble */}
                      <div
                        className={`audit-page-score audit-page-score-${r.error ? "poor" : scoreGrade(r.score)}`}
                        style={!r.error ? ({ "--audit-score-accent": scoreAccentColor(r.score) } as CSSProperties) : undefined}
                      >
                        {r.error ? "!" : r.score}
                      </div>

                      {/* URL + cats */}
                      <div className="audit-page-info">
                        <div className="audit-page-url-row">
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="audit-page-url"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {r.url}
                          </a>
                          {note && <span className="audit-page-note muted-copy">{note}</span>}
                        </div>

                        {!r.error && Object.values(r.categoryScores).some((v) => typeof v === "number") && (
                          <div className="audit-page-cats">
                            {CATEGORY_ORDER.filter((k) => typeof r.categoryScores[k] === "number").map((k) => (
                              <span
                                key={k}
                                className={`audit-page-cat audit-page-cat-${scoreGrade(r.categoryScores[k]!)}`}
                              >
                                {CATEGORY_LABELS[k].split(" ")[0]}
                                <strong>{r.categoryScores[k]}</strong>
                              </span>
                            ))}
                          </div>
                        )}

                        {r.error && (
                          <p className="audit-page-error-msg muted-copy">{r.error}</p>
                        )}
                      </div>

                      {/* Right side: badge + chevron */}
                      <div className="audit-page-right">
                        {!r.error && (
                          <span className={`mini-pill audit-grade-pill audit-grade-${scoreGrade(r.score)}`}>{grade}</span>
                        )}
                        {!r.error && criticalCount > 0 && (
                          <span className="mini-pill badge-critical">{criticalCount} Critical</span>
                        )}
                        {!r.error && criticalCount === 0 && highCount > 0 && (
                          <span className="mini-pill badge-high">{highCount} High</span>
                        )}
                        {r.error && (
                          <span className="mini-pill badge-critical">Scan Error</span>
                        )}
                        <ChevronDown
                          className="audit-page-chevron"
                          aria-hidden="true"
                          style={{ transform: isOpen ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }}
                        />
                      </div>
                    </button>

                    {/* Expanded issues */}
                    {isOpen && !r.error && (
                      <div className="audit-page-expanded">
                        {pageIssues.length > 0 ? (
                          <>
                            <p className="audit-expanded-label">Top issues for this page</p>
                            <div className="audit-expanded-issues">
                              {pageIssues.slice(0, 5).map((issue) => {
                                const severity = toIssueSeverity(issue.priority);
                                return (
                                <div key={issue.id} className="audit-expanded-issue-row">
                                  <div className="audit-expanded-issue-main">
                                    <div className="audit-expanded-issue-head">
                                      <strong>{issue.label}</strong>
                                      <span className={`mini-pill ${severityBadgeClass(severity)}`}>{severityLabel(severity)}</span>
                                    </div>
                                    <p className="audit-expanded-issue-problem">{issue.detail}</p>
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                            {r.reportId && (
                              <a className="audit-view-report-link" href={`/report?id=${encodeURIComponent(r.reportId)}`}>
                                View full report <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </>
                        ) : !hasIssuesData(r) ? (
                          <p className="muted-copy">Issue details not available for this scan. Run a new audit to see per-page issues.</p>
                        ) : r.topIssue ? (
                          <>
                            <p className="audit-expanded-label">Top issue for this page</p>
                            <div className="audit-expanded-issues">
                              <div className="audit-expanded-issue-row">
                                <div className="audit-expanded-issue-main">
                                  <div className="audit-expanded-issue-head">
                                    <strong>{r.topIssue}</strong>
                                    <span className="mini-pill badge-high">High</span>
                                  </div>
                                  <p className="audit-expanded-issue-problem">{r.topIssue}</p>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="muted-copy">No issues found - this page is well optimised.</p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
              {isRunning && audit.total_pages > sortedResults.length && (
                Array.from({ length: Math.min(3, audit.total_pages - sortedResults.length) }).map((_, idx) => (
                  <article key={`skeleton-${idx}`} className="audit-page-card audit-page-card-skeleton">
                    <div className="audit-page-card-toggle">
                      <div className="audit-skeleton-circle" />
                      <div className="audit-page-info">
                        <div className="audit-skeleton-line audit-skeleton-line-url" />
                        <div className="audit-skeleton-pill-row">
                          <span className="audit-skeleton-pill" />
                          <span className="audit-skeleton-pill" />
                          <span className="audit-skeleton-pill" />
                        </div>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {/* â"€â"€ Empty state while pending â"€â"€ */}
        {!isRunning && audit.results.length === 0 && (
          <section className="surface report-card">
            <div className="audit-empty-state">
              <LayoutGrid className="h-8 w-8 audit-empty-icon" />
              <strong>No pages scanned yet</strong>
              <p>The audit is queued and will begin scanning shortly.</p>
            </div>
          </section>
        )}

      </section>

      {/* â"€â"€ Print layout â"€â"€ */}
      <div className="audit-print-layout">
        <div className="apl-cover-page">
          <div className="apl-brand">AEOCheck</div>
          <strong className="apl-domain">{audit.domain}</strong>
          <span className="apl-date">AEO Site Audit - {formatDate(audit.created_at)}</span>
          {aggregateScore != null && (
            <div className="apl-cover-score">
              <strong>{aggregateScore}/100</strong>
              <span>{statusLabel(aggregateScore)}</span>
            </div>
          )}
        </div>

        <div className="apl-header">
          <div>
            <strong className="apl-domain">Category Averages</strong>
            <span className="apl-date">Generated {formatDate(audit.created_at)}</span>
          </div>
        </div>

        {avgCategoryScores && Object.keys(avgCategoryScores).length > 0 && (
          <table className="apl-table apl-category-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Average Score</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORY_ORDER.filter((k) => typeof avgCategoryScores[k] === "number").map((k) => (
                <tr key={k}>
                  <td>{CATEGORY_LABELS[k]}</td>
                  <td>{avgCategoryScores[k]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="apl-patterns">
          <h3>Site-wide Patterns</h3>
          {siteWideIssues.length === 0 ? (
            <p>No recurring issues found across pages.</p>
          ) : (
            <ul>
              {siteWideIssues.map((issue) => (
                <li key={issue.id}>
                  {issue.label} - affects {issue.count} of {pageCount} pages
                </li>
              ))}
            </ul>
          )}
        </div>

        <table className="apl-table">
          <thead>
            <tr>
              <th>Page</th>
              <th>Score</th>
              <th>Critical</th>
              <th>High</th>
              <th>Top Issue</th>
            </tr>
          </thead>
          <tbody>
            {audit.results.map((r) => (
              <tr key={r.url}>
                <td className="apl-url">{r.url}</td>
                <td>{r.error ? "Error" : r.score}</td>
                <td>{r.error ? "-" : r.criticalCount}</td>
                <td>{r.error ? "-" : r.highCount}</td>
                <td>{r.topIssue ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SiteFooter />
    </main>
  );
}
