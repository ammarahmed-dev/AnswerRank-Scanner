"use client";

import { FormEvent, useMemo, useState } from "react";
import ScoreCircle from "./ScoreCircle";

type CompareItem = {
  url: string;
  score: number;
  metrics: {
    overall: number;
    entity: number;
    schema: number;
    proof: number;
  };
};

type CompareResponse = {
  competitors: CompareItem[];
  comparison?: {
    primaryScore: number;
    competitorScore: number;
    scoreGap: number;
    winner: "primary" | "competitor" | "tie";
    categoryBreakdown: Array<{
      category: string;
      primaryScore: number;
      competitorScore: number;
      gap: number;
      winner: "primary" | "competitor" | "tie";
    }>;
    advantages: Array<{
      title: string;
      description: string;
      category: string;
      impact: "high" | "medium" | "low";
    }>;
    gaps: Array<{
      title: string;
      description: string;
      category: string;
      impact: "high" | "medium" | "low";
    }>;
    summary: string;
  };
  error?: string;
};

export type ComparePanelSummary = {
  state: "idle" | "loading" | "ready" | "error";
  primaryDomain?: string;
  competitorDomain?: string;
  primaryScore?: number;
  competitorScore?: number;
  scoreGap?: number;
  winner?: "primary" | "competitor" | "tie";
  strongestAdvantage?: string;
  biggestGap?: string;
};

type CompareWorkbenchProps = {
  onSummaryChange?: (summary: ComparePanelSummary) => void;
};

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function prettyCategory(category: string) {
  if (category === "performance" || category === "core_web_vitals") return "Performance";
  if (category === "aiReadiness") return "AI Readiness";
  if (category === "contentClarity") return "Content Clarity";
  if (category === "trustSignals") return "Trust Signals";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function gapLine(scoreGap: number, competitorDomain: string) {
  if (scoreGap > 0) return `Your site is ${scoreGap} points ahead of ${competitorDomain}.`;
  if (scoreGap < 0) return `Your site is ${Math.abs(scoreGap)} points behind ${competitorDomain}.`;
  return "Both sites have the same overall score.";
}

function normalizeCategoryKey(raw: string) {
  const key = raw.trim().toLowerCase();
  if (key === "metadata") return "metadata";
  if (key === "schema") return "schema";
  if (key === "aireadiness" || key === "ai_readiness" || key === "answerreadiness" || key === "answer_readiness") return "aiReadiness";
  if (key === "performance" || key === "corewebvitals" || key === "core_web_vitals") return "performance";
  return raw;
}

export default function CompareWorkbench({ onSummaryChange }: CompareWorkbenchProps) {
  const [primaryUrl, setPrimaryUrl] = useState("");
  const [competitorUrl, setCompetitorUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CompareResponse | null>(null);

  const comparison = result?.comparison;
  const primary = result?.competitors?.[0];
  const competitor = result?.competitors?.[1];

  const winnerLabel = useMemo(() => {
    if (!comparison) return "";
    if (comparison.winner === "tie") return "Tie";
    return comparison.winner === "primary" ? "You are ahead" : "Competitor is ahead";
  }, [comparison]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const a = primaryUrl.trim();
    const b = competitorUrl.trim();

    if (!a || !b) {
      setError("Please enter both URLs before running a comparison.");
      setResult(null);
      onSummaryChange?.({ state: "error" });
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    onSummaryChange?.({ state: "loading" });
    const startedAt = Date.now();

    try {
      const response = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryUrl: a, competitorUrl: b }),
      });
      const payload = (await response.json()) as CompareResponse;
      const elapsed = Date.now() - startedAt;
      if (elapsed < 1200) {
        await new Promise((resolve) => setTimeout(resolve, 1200 - elapsed));
      }
      if (!response.ok) {
        setError(payload.error || "Comparison failed. Please try different URLs.");
        onSummaryChange?.({ state: "error" });
        return;
      }
      setResult(payload);
      const primaryItem = payload.competitors?.[0];
      const competitorItem = payload.competitors?.[1];
      const comparisonData = payload.comparison;
      const strongestAdvantage = comparisonData?.advantages?.[0]?.title;
      const biggestGap = comparisonData?.gaps?.[0]?.title;
      onSummaryChange?.({
        state: "ready",
        primaryDomain: primaryItem?.url ? hostLabel(primaryItem.url) : undefined,
        competitorDomain: competitorItem?.url ? hostLabel(competitorItem.url) : undefined,
        primaryScore: comparisonData?.primaryScore,
        competitorScore: comparisonData?.competitorScore,
        scoreGap: comparisonData?.scoreGap,
        winner: comparisonData?.winner,
        strongestAdvantage,
        biggestGap,
      });
    } catch {
      setError("Could not reach the comparison service. Please try again.");
      onSummaryChange?.({ state: "error" });
    } finally {
      setLoading(false);
    }
  };

  const normalizedBreakdown = (comparison?.categoryBreakdown ?? []).map((row) => {
    const normalizedCategory = normalizeCategoryKey(row.category);
    return {
      ...row,
      category: normalizedCategory,
      primaryScore: Number.isFinite(row.primaryScore) ? row.primaryScore : 0,
      competitorScore: Number.isFinite(row.competitorScore) ? row.competitorScore : 0,
      gap: Number.isFinite(row.gap) ? row.gap : 0,
    };
  });

  const categoryOrder = ["metadata", "schema", "aiReadiness", "performance"] as const;
  const categoryRows = categoryOrder.map((category) => {
    const match = normalizedBreakdown.find((row) => row.category === category);
    if (match) return { ...match, unavailable: false };
    return {
      category,
      primaryScore: 0,
      competitorScore: 0,
      gap: 0,
      winner: "tie" as const,
      unavailable: true,
    };
  });

  return (
    <section className="surface dashboard-compare">
      <div className="dashboard-section-header compare-head">
        <div>
          <span className="launch-eyebrow">Compare</span>
          <h2>Compare your site against a competitor</h2>
          <p className="compare-subcopy">See where your site is stronger, weaker, or missing AI search signals.</p>
        </div>
      </div>

      <form className="compare-form" onSubmit={submit} noValidate>
        <label className="compare-input">
          <span>Your website URL</span>
          <input
            type="url"
            placeholder="https://yourwebsite.com"
            value={primaryUrl}
            onChange={(e) => setPrimaryUrl(e.target.value)}
            disabled={loading}
          />
        </label>
        <label className="compare-input">
          <span>Competitor URL</span>
          <input
            type="url"
            placeholder="https://competitor.com"
            value={competitorUrl}
            onChange={(e) => setCompetitorUrl(e.target.value)}
            disabled={loading}
          />
        </label>
        <button type="submit" className="btn btn-primary compare-submit" disabled={loading}>
          {loading ? "Comparing..." : "Run Comparison"}
        </button>
      </form>

      {error && <p className="compare-error">{error}</p>}

      {!loading && !error && !comparison && (
        <p className="compare-empty">Enter both URLs to run a side by side comparison.</p>
      )}

      {loading && (
        <div className="compare-loading-card">
          <strong>Comparing both sites</strong>
          <p>Scanning your site and competitor site for AI visibility signals.</p>
          <div className="loading-progress">
            <div className="loading-progress-fill" />
          </div>
        </div>
      )}

      {comparison && primary && competitor && (
        <div className="compare-results">
          <article className="compare-summary-card">
            <div className="compare-summary-hero">
              <h3>
                {comparison.scoreGap > 0
                  ? `You are ahead by ${comparison.scoreGap} points`
                  : comparison.scoreGap < 0
                    ? `You are behind by ${Math.abs(comparison.scoreGap)} points`
                    : "Both sites are tied"}
              </h3>
              <p>{`${hostLabel(primary.url)} scored ${comparison.primaryScore} compared to ${hostLabel(competitor.url)} at ${comparison.competitorScore}.`}</p>
            </div>
            <div className="compare-summary-stat-grid">
              <div className="compare-summary-stat">
                <small>Score gap</small>
                <strong className="compare-mono">{comparison.scoreGap > 0 ? `+${comparison.scoreGap}` : comparison.scoreGap}</strong>
              </div>
              <div className="compare-summary-stat">
                <small>Winner</small>
                <strong>{winnerLabel === "You are ahead" ? "Your site" : winnerLabel === "Competitor is ahead" ? "Competitor" : "Tie"}</strong>
              </div>
              <div className="compare-summary-stat">
                <small>Competitor</small>
                <strong className="compare-mono">{hostLabel(competitor.url)}</strong>
              </div>
            </div>
            <p className="compare-summary-line">{gapLine(comparison.scoreGap, hostLabel(competitor.url))}</p>
          </article>

          <div className="compare-score-grid">
            <article className="compare-score-card">
              <small>Your page</small>
              <ScoreCircle score={comparison.primaryScore} />
            </article>
            <article className="compare-score-card">
              <small>Competitor page</small>
              <ScoreCircle score={comparison.competitorScore} />
            </article>
          </div>

          <article className="compare-categories">
              <h3>Category breakdown</h3>
              <div className="compare-category-list">
              {categoryRows.map((row) => (
                <div key={row.category} className="compare-category-row">
                  <div className="compare-category-head">
                    <strong>{prettyCategory(row.category)}</strong>
                    <small className="compare-category-label">
                      {(row as { unavailable?: boolean }).unavailable
                        ? "Not available"
                        : row.winner === "tie"
                        ? "Same score"
                        : row.winner === "primary"
                          ? "You are ahead"
                          : "Competitor is ahead"}
                    </small>
                    <span className={`compare-gap-badge is-${row.winner}`}>
                      {row.gap > 0 ? `+${row.gap}` : row.gap}
                    </span>
                  </div>
                  <div className="compare-category-scores">
                    <span>Yours <em className="compare-mono">{row.primaryScore}</em></span>
                    <span>Competitor <em className="compare-mono">{row.competitorScore}</em></span>
                  </div>
                  <div className="score-bar">
                    <span className="score-bar-fill" style={{ width: `${Math.max(0, Math.min(100, row.primaryScore))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <div className="compare-gap-grid">
            <article className="compare-gap-card">
              <h3>Where you win</h3>
              {comparison.advantages.length ? (
                <ul>
                  {comparison.advantages.map((item) => (
                    <li key={`${item.category}-${item.title}`}>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No category leads yet.</p>
              )}
            </article>
            <article className="compare-gap-card">
              <h3>Where competitor wins</h3>
              {comparison.gaps.length ? (
                <ul>
                  {comparison.gaps.map((item) => (
                    <li key={`${item.category}-${item.title}`}>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No category gaps right now.</p>
              )}
            </article>
          </div>
        </div>
      )}
    </section>
  );
}
