"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";

type CompareItem = { url: string; score: number };

type CategoryRow = {
  category: string;
  primaryScore: number | null;
  competitorScore: number | null;
  gap: number | null;
  winner: "primary" | "competitor" | "tie";
};

type InsightItem = {
  title: string;
  description: string;
  category: string;
  impact: "high" | "medium" | "low";
};

type CompareResult = {
  competitors?: CompareItem[];
  comparison?: {
    primaryScore: number;
    competitorScore: number;
    scoreGap: number;
    winner: "primary" | "competitor" | "tie";
    categoryBreakdown?: CategoryRow[];
    advantages?: InsightItem[];
    gaps?: InsightItem[];
    summary?: string;
  };
  error?: string;
};

function hostLabel(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function normalizeCategoryKey(raw: string) {
  const key = raw.trim().toLowerCase();
  if (key === "metadata") return "metadata";
  if (key === "schema") return "schema";
  if (["aireadiness","ai_readiness","answerreadiness","answer_readiness"].includes(key)) return "aiReadiness";
  if (["performance","corewebvitals","core_web_vitals"].includes(key)) return "performance";
  return raw;
}

function prettyCategory(cat: string) {
  if (cat === "performance" || cat === "core_web_vitals") return "Performance";
  if (cat === "aiReadiness" || cat === "answerReadiness") return "Answer readiness";
  if (cat === "metadata") return "Metadata";
  if (cat === "schema") return "Schema";
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

const CATEGORY_ORDER = ["metadata", "schema", "aiReadiness", "performance"] as const;

function heroLine(scoreGap: number, competitorDomain: string): string {
  if (scoreGap > 0) return `Your site is ${scoreGap} point${scoreGap === 1 ? "" : "s"} ahead of ${competitorDomain}.`;
  if (scoreGap < 0) return `Your site is ${Math.abs(scoreGap)} point${Math.abs(scoreGap) === 1 ? "" : "s"} behind ${competitorDomain}.`;
  return "Both sites have the same AI visibility score.";
}

function closestCat(breakdown: CategoryRow[]): string {
  const comparable = breakdown.filter((row) => typeof row.gap === "number");
  if (!comparable.length) return "No data";
  const sorted = [...comparable].sort((a, b) => Math.abs(a.gap as number) - Math.abs(b.gap as number));
  return prettyCategory(normalizeCategoryKey(sorted[0].category));
}

function gapRecs(breakdown: CategoryRow[] | undefined): Array<{ category: string; text: string }> {
  const losers = (breakdown ?? []).filter(r => r.winner === "competitor").map(r => normalizeCategoryKey(r.category));
  const MAP = {
    schema:      { category: "Schema",           text: "Improve structured data coverage to help AI engines extract your content." },
    aiReadiness: { category: "Answer readiness", text: "Clarify primary entities and audience to improve AI answer extraction." },
    metadata:    { category: "Metadata",         text: "Rewrite title and meta descriptions for clearer AI interpretation." },
    performance: { category: "Performance",      text: "Improve Core Web Vitals and performance signals for better trust scores." },
  } as const;
  return (["schema","aiReadiness","metadata","performance"] as const).filter(k => losers.includes(k)).map(k => MAP[k]);
}

export default function CompareReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<CompareResult | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      fetch(`/api/compare-result?token=${encodeURIComponent(token)}`)
        .then((r) => r.ok ? r.json() : null)
        .then((result: CompareResult | null) => {
          if (result) { setData(result); setReady(true); return; }
          const raw = sessionStorage.getItem("aeocheck_compare_result");
          if (raw) { try { setData(JSON.parse(raw) as CompareResult); } catch {} }
          setReady(true);
        })
        .catch(() => {
          const raw = sessionStorage.getItem("aeocheck_compare_result");
          if (raw) { try { setData(JSON.parse(raw) as CompareResult); } catch {} }
          setReady(true);
        });
    } else {
      const raw = sessionStorage.getItem("aeocheck_compare_result");
      if (raw) { try { setData(JSON.parse(raw) as CompareResult); } catch {} }
      setReady(true);
    }
  }, [searchParams]);

  if (!ready) return null;

  const cmp = data?.comparison;
  const primary = data?.competitors?.[0];
  const competitor = data?.competitors?.[1];
  const primaryDomain = primary ? hostLabel(primary.url) : "Your site";
  const competitorDomain = competitor ? hostLabel(competitor.url) : "Competitor";

  const normalizedBreakdown = CATEGORY_ORDER.map(cat => {
    const raw = (cmp?.categoryBreakdown ?? []).find(r => normalizeCategoryKey(r.category) === cat);
    if (raw) return { ...raw, category: cat,
      primaryScore: Number.isFinite(raw.primaryScore) ? raw.primaryScore : null,
      competitorScore: Number.isFinite(raw.competitorScore) ? raw.competitorScore : null,
      gap: Number.isFinite(raw.gap) ? raw.gap : null,
      unavailable: !Number.isFinite(raw.primaryScore) && !Number.isFinite(raw.competitorScore) };
    return { category: cat, primaryScore: null, competitorScore: null, gap: null, winner: "tie" as const, unavailable: true };
  });

  const hasInsights = (cmp?.advantages?.length ?? 0) > 0 || (cmp?.gaps?.length ?? 0) > 0;
  const recs = gapRecs(cmp?.categoryBreakdown);
  const strongest = cmp?.advantages?.[0]?.title ?? "No advantages identified";
  const biggest = cmp?.gaps?.[0]?.title ?? "No gaps identified";
  const closest = cmp?.categoryBreakdown?.length ? closestCat(cmp.categoryBreakdown) : "No data";
  const winnerLabel = cmp?.winner === "primary" ? "Your site" : cmp?.winner === "competitor" ? "Competitor" : "Tied";

  return (
    <>
      <SiteHeader />
      <main className="page-transition compare-report-page">
        <div className="launch-container compare-report-layout">

          {!data || !cmp ? (
            <div className="compare-report-empty">
              <p>No comparison data found.</p>
              <button className="btn btn-primary" onClick={() => router.push("/#scanner")}>
                Run a comparison
              </button>
            </div>
          ) : (
            <>
              {/* ── Hero ── */}
              <div className="compare-report-hero">
                <div className="compare-hero-left">
                  <span className="launch-eyebrow">Comparison Report</span>
                  <h1 className="compare-report-title">{primaryDomain} vs {competitorDomain}</h1>
                  <p className="compare-report-summary">{heroLine(cmp.scoreGap, competitorDomain)}</p>
                  <div className="compare-report-meta">
                    <span className="compare-meta-pill">{primaryDomain}</span>
                    <span className="compare-meta-sep">vs</span>
                    <span className="compare-meta-pill">{competitorDomain}</span>
                  </div>
                </div>
                <div className="compare-hero-right">
                  <div className="compare-hero-takeaway">
                    <p className="compare-takeaway-heading">Snapshot</p>
                    <div className="compare-takeaway-row">
                      <span className="compare-takeaway-label">Your score</span>
                      <span className="compare-takeaway-val">{cmp.primaryScore}</span>
                    </div>
                    <div className="compare-takeaway-row">
                      <span className="compare-takeaway-label">Competitor</span>
                      <span className="compare-takeaway-val">{cmp.competitorScore}</span>
                    </div>
                    <div className="compare-takeaway-row">
                      <span className="compare-takeaway-label">Gap</span>
                      <span className={`compare-takeaway-val${cmp.scoreGap > 0 ? " is-ahead" : cmp.scoreGap < 0 ? " is-behind" : ""}`}>
                        {cmp.scoreGap > 0 ? `+${cmp.scoreGap}` : cmp.scoreGap < 0 ? `${cmp.scoreGap}` : "0"}
                      </span>
                    </div>
                    <div className="compare-takeaway-row">
                      <span className="compare-takeaway-label">Winner</span>
                      <span className={`compare-takeaway-val${cmp.winner === "primary" ? " is-ahead" : cmp.winner === "competitor" ? " is-behind" : ""}`}>
                        {winnerLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Score overview ── */}
              <div className="compare-scores-panel">
                <div className="compare-report-scores">
                  <div className={`compare-report-score-card${cmp.winner === "primary" ? " is-winner" : ""}`}>
                    <small>Your site</small>
                    <strong className="compare-report-score-value">{cmp.primaryScore}</strong>
                    <span className="compare-score-domain">{primaryDomain}</span>
                    {cmp.winner === "primary" && <span className="compare-winner-badge">Winner</span>}
                  </div>
                  <div className="compare-report-gap-wrap">
                    <div className={`compare-report-gap ${cmp.scoreGap > 0 ? "gap-ahead" : cmp.scoreGap < 0 ? "gap-behind" : "gap-tied"}`}>
                      {cmp.scoreGap > 0 ? `+${cmp.scoreGap}` : cmp.scoreGap < 0 ? `${cmp.scoreGap}` : "Tied"}
                    </div>
                    <span className="compare-gap-caption">Score gap</span>
                  </div>
                  <div className={`compare-report-score-card${cmp.winner === "competitor" ? " is-winner" : ""}`}>
                    <small>Competitor</small>
                    <strong className="compare-report-score-value">{cmp.competitorScore}</strong>
                    <span className="compare-score-domain">{competitorDomain}</span>
                    {cmp.winner === "competitor" && <span className="compare-winner-badge">Winner</span>}
                  </div>
                </div>
              </div>

              {/* ── Category breakdown ── */}
              <div className="compare-report-section">
                <h2 className="compare-section-heading">Category breakdown</h2>
                <div className="compare-report-category-list">
                  {normalizedBreakdown.map(row => (
                    <div key={row.category} className={`compare-category-row${row.unavailable ? " is-na" : ""}`}>
                      <div className="compare-cat-name">
                        <strong>{prettyCategory(row.category)}</strong>
                        <span className="compare-cat-status">
                          {row.unavailable
                            ? "Not available"
                            : row.primaryScore === null || row.competitorScore === null
                              ? "Partially available"
                              : row.winner === "tie"
                                ? "Same score"
                                : row.winner === "primary"
                                  ? "You lead"
                                  : "Competitor leads"}
                        </span>
                      </div>
                      {row.unavailable ? (
                        <>
                          <div className="compare-bar-cell" />
                          <div className="compare-bar-cell" />
                        </>
                      ) : (
                        <>
                          <div className="compare-bar-cell">
                            <div className="compare-bar-label-row">
                              <span>Your site</span>
                              <em className="compare-mono">{row.primaryScore === null ? "Not available" : row.primaryScore}</em>
                            </div>
                            {row.primaryScore === null ? (
                              <div className="compare-na-inline">Not available</div>
                            ) : (
                              <div className="score-bar compare-slim-bar">
                                <span className="score-bar-fill" style={{ width: `${Math.max(0, Math.min(100, row.primaryScore))}%` }} />
                              </div>
                            )}
                          </div>
                          <div className="compare-bar-cell">
                            <div className="compare-bar-label-row">
                              <span>Competitor</span>
                              <em className="compare-mono">{row.competitorScore === null ? "Not available" : row.competitorScore}</em>
                            </div>
                            {row.competitorScore === null ? (
                              <div className="compare-na-inline">Not available</div>
                            ) : (
                              <div className="score-bar compare-slim-bar">
                                <span className="score-bar-fill" style={{ width: `${Math.max(0, Math.min(100, row.competitorScore))}%` }} />
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      <span className={`compare-gap-badge is-${row.unavailable ? "tie" : row.winner}`}>
                        {row.unavailable || row.gap === null ? "N/A" : row.gap > 0 ? `+${row.gap}` : row.gap}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Comparison overview ── */}
              <div className="compare-report-section">
                <h2 className="compare-section-heading">Comparison overview</h2>
                <div className="compare-overview-grid">
                  <div className="compare-overview-card">
                    <p className="compare-overview-label">Strongest advantage</p>
                    <p className="compare-overview-value">{strongest}</p>
                    <p className="compare-overview-helper">Primary opportunity where your site is currently ahead.</p>
                  </div>
                  <div className="compare-overview-card">
                    <p className="compare-overview-label">Biggest gap</p>
                    <p className="compare-overview-value">{biggest}</p>
                    <p className="compare-overview-helper">Highest-impact area where competitor signals are stronger.</p>
                  </div>
                  <div className="compare-overview-card">
                    <p className="compare-overview-label">Closest category</p>
                    <p className="compare-overview-value">{closest}</p>
                    <p className="compare-overview-helper">The most competitive category between both sites.</p>
                  </div>
                  <div className="compare-overview-card is-teal">
                    <p className="compare-overview-label">Overall winner</p>
                    <p className="compare-overview-value">{winnerLabel}</p>
                    <p className="compare-overview-helper">Overall AI visibility outcome based on total score.</p>
                  </div>
                </div>
              </div>

              {/* ── Insights ── */}
              {hasInsights && (
                <div className="compare-report-section">
                  <h2 className="compare-section-heading">Where each site wins</h2>
                  <div className="compare-insights-grid">
                    <div className="compare-insights-col">
                      <h3 className="compare-insights-col-heading">Where you win</h3>
                      {cmp.advantages?.length ? (
                        <ul className="compare-insights-list">
                          {cmp.advantages.map(item => (
                            <li key={`adv-${item.category}-${item.title}`} className="compare-insight-item">
                              <div className="compare-insight-head">
                                <strong>{item.title}</strong>
                                <span className={`compare-impact-badge is-${item.impact}`}>{item.impact}</span>
                              </div>
                              <span className="compare-insight-cat">{prettyCategory(normalizeCategoryKey(item.category))}</span>
                              <p className="compare-insight-desc">{item.description}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="compare-insight-empty">No category leads yet.</div>
                      )}
                    </div>
                    <div className="compare-insights-col">
                      <h3 className="compare-insights-col-heading">Where competitor wins</h3>
                      {cmp.gaps?.length ? (
                        <ul className="compare-insights-list">
                          {cmp.gaps.map(item => (
                            <li key={`gap-${item.category}-${item.title}`} className="compare-insight-item">
                              <div className="compare-insight-head">
                                <strong>{item.title}</strong>
                                <span className={`compare-impact-badge is-${item.impact}`}>{item.impact}</span>
                              </div>
                              <span className="compare-insight-cat">{prettyCategory(normalizeCategoryKey(item.category))}</span>
                              <p className="compare-insight-desc">{item.description}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="compare-insight-empty">No category gaps right now.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Recommendations ── */}
              <div className="compare-report-section">
                <h2 className="compare-section-heading">Recommended next moves</h2>
                {recs.length > 0 ? (
                  <ul className="compare-rec-list">
                    {recs.map((rec, idx) => (
                      <li key={rec.category} className="compare-rec-item">
                        <span className="compare-rec-num">{idx + 1}</span>
                        <div className="compare-rec-body">
                          <span className="compare-rec-cat">{rec.category}</span>
                          <p>{rec.text}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="compare-rec-empty">
                    <strong className="compare-rec-empty-title">Maintain your lead</strong>
                    <p className="compare-rec-empty-text">Your site leads or ties across all categories. Keep improving AI visibility signals to protect the advantage.</p>
                  </div>
                )}
              </div>

              {/* ── CTA ── */}
              <div className="compare-report-cta-panel">
                <div className="compare-report-cta">
                  <button className="btn btn-primary" onClick={() => router.push("/#scanner")}>
                    Run another comparison
                  </button>
                  <button className="btn btn-secondary" onClick={() => router.push("/")}>
                    Back to scanner
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </main>
      <SiteFooter />
    </>
  );
}
