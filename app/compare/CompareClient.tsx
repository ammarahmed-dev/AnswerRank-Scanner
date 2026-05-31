"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import UpgradeButton from "../components/UpgradeButton";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/app/context/AuthContext";

type CategoryRow = {
  category: string;
  primaryScore: number | null;
  competitorScore: number | null;
  gap: number | null;
  winner: string;
};

type CompareResult = {
  competitors: Array<{ url: string; score: number }>;
  comparison: {
    primaryScore: number;
    competitorScore: number;
    scoreGap: number;
    winner: "primary" | "competitor" | "tie";
    categoryBreakdown: CategoryRow[];
    summary: string;
  };
};

type CompareRun = {
  id: string;
  url_a: string;
  url_b: string;
  score_a: number | null;
  score_b: number | null;
  created_at: string;
};

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function toLabel(cat: string) {
  const labels: Record<string, string> = {
    aiReadiness: "AI Readiness",
    contentClarity: "Content Clarity",
    trustSignals: "Trust Signals",
    performance: "Performance",
    schema: "Schema",
    metadata: "Metadata",
    headings: "Headings",
  };
  return labels[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1);
}

export default function CompareClient() {
  const supabase = getSupabaseBrowserClient();
  const { user, plan } = useAuth();
  const isPro = plan === "pro" || plan === "agency";

  const [urlA, setUrlA] = useState("");
  const [urlB, setUrlB] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CompareResult | null>(null);
  const [history, setHistory] = useState<CompareRun[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    if (!isPro || !user || !supabase) return;
    let active = true;
    (async () => {
      const token = (await getSafeSupabaseSession(supabase))?.access_token;
      if (!token || !active) return;
      try {
        const res = await fetch("/api/compare-history", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok || !active) return;
        const data = (await res.json()) as { runs: CompareRun[] };
        setHistory(data.runs ?? []);
      } catch { /* table may not exist yet */ }
      setHistoryLoaded(true);
    })();
    return () => { active = false; };
  }, [isPro, user, supabase]);

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedA = normalizeUrl(urlA);
    const normalizedB = normalizeUrl(urlB);
    if (!normalizedA || !normalizedB) return;
    if (normalizedA !== urlA) setUrlA(normalizedA);
    if (normalizedB !== urlB) setUrlB(normalizedB);
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const token = supabase ? (await getSafeSupabaseSession(supabase))?.access_token : undefined;
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ primaryUrl: normalizedA, competitorUrl: normalizedB }),
      });
      const data = (await res.json()) as CompareResult & { error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Comparison failed. Please try again.");
        setLoading(false);
        return;
      }
      setResult(data);
      if (isPro) {
        const newRun: CompareRun = {
          id: crypto.randomUUID(),
          url_a: normalizedA,
          url_b: normalizedB,
          score_a: data.comparison.primaryScore,
          score_b: data.comparison.competitorScore,
          created_at: new Date().toISOString(),
        };
        setHistory(prev => [newRun, ...prev].slice(0, 10));
      }
    } catch {
      setError("Comparison failed. Check both URLs and try again.");
    }
    setLoading(false);
  };

  const prefill = (run: CompareRun) => {
    setUrlA(run.url_a);
    setUrlB(run.url_b);
    setResult(null);
    setError("");
  };

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="dashboard-page app-container">

        <div className="dashboard-hero">
          <div>
            <span className="launch-eyebrow">URL Compare</span>
            <h1>Compare two URLs</h1>
            <p>See which page performs better for AI visibility.</p>
          </div>
          <Link href="/dashboard" className="btn btn-secondary">Dashboard</Link>
        </div>

        <section className="surface" style={{ padding: "28px" }}>
          <form onSubmit={handleCompare}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label style={{ display: "block", fontSize: 12, color: "var(--color-ink-muted)", marginBottom: 6 }}>Your URL</label>
                <input
                  type="text"
                  value={urlA}
                  onChange={e => setUrlA(e.target.value)}
                  placeholder="https://yoursite.com"
                  required
                  disabled={loading}
                  style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--color-line-strong)", borderRadius: "var(--radius-lg)", padding: "12px 14px", color: "inherit", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label style={{ display: "block", fontSize: 12, color: "var(--color-ink-muted)", marginBottom: 6 }}>Competitor URL</label>
                <input
                  type="text"
                  value={urlB}
                  onChange={e => setUrlB(e.target.value)}
                  placeholder="https://competitor.com"
                  required
                  disabled={loading}
                  style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid var(--color-line-strong)", borderRadius: "var(--radius-lg)", padding: "12px 14px", color: "inherit", fontSize: 14, boxSizing: "border-box" }}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ minWidth: "160px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, whiteSpace: "nowrap" }}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <ArrowLeftRight className="h-4 w-4" />
                {loading ? "Comparing…" : "Compare URLs"}
              </button>
            </div>
          </form>
          {error && <p style={{ marginTop: 12, fontSize: 13, color: "#f87171" }}>{error}</p>}
        </section>

        {result && (
          <section className="surface" style={{ padding: "28px", marginTop: 16 }}>
            <p style={{ fontSize: 14, color: "var(--color-ink-muted)", marginBottom: 20 }}>{result.comparison.summary}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              {result.competitors.map((c, i) => (
                <div key={i} style={{ padding: "20px", border: `1.5px solid ${i === 0 && result.comparison.winner === "primary" ? "var(--color-primary)" : i === 1 && result.comparison.winner === "competitor" ? "var(--color-primary)" : "var(--color-line-strong)"}`, borderRadius: "var(--radius-xl)", textAlign: "center" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--color-ink-muted)", wordBreak: "break-all" }}>{c.url}</p>
                  <strong style={{ fontSize: "2.5rem", color: "var(--color-primary)", lineHeight: 1 }}>{c.score}</strong>
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--color-ink-muted)" }}>
                    {result.comparison.winner === (i === 0 ? "primary" : "competitor") ? "🏆 Winner" : result.comparison.winner === "tie" ? "Tied" : ""}
                  </p>
                </div>
              ))}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-line)" }}>
                  <th style={{ textAlign: "left", padding: "8px 0", color: "var(--color-ink-muted)", fontWeight: 500 }}>Category</th>
                  <th style={{ textAlign: "center", padding: "8px 0", color: "var(--color-ink-muted)", fontWeight: 500 }}>Your URL</th>
                  <th style={{ textAlign: "center", padding: "8px 0", color: "var(--color-ink-muted)", fontWeight: 500 }}>Competitor</th>
                  <th style={{ textAlign: "center", padding: "8px 0", color: "var(--color-ink-muted)", fontWeight: 500 }}>Gap</th>
                </tr>
              </thead>
              <tbody>
                {result.comparison.categoryBreakdown.map(row => (
                  <tr key={row.category} style={{ borderBottom: "1px solid var(--color-line)" }}>
                    <td style={{ padding: "10px 0" }}>{toLabel(row.category)}</td>
                    <td style={{ textAlign: "center", padding: "10px 0" }}>{row.primaryScore ?? "—"}</td>
                    <td style={{ textAlign: "center", padding: "10px 0" }}>{row.competitorScore ?? "—"}</td>
                    <td style={{ textAlign: "center", padding: "10px 0", color: (row.gap ?? 0) > 0 ? "var(--color-primary)" : (row.gap ?? 0) < 0 ? "#f87171" : "var(--color-ink-muted)", fontWeight: 600 }}>
                      {row.gap !== null ? (row.gap > 0 ? `+${row.gap}` : row.gap) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {!isPro && (
          <section className="surface" style={{ padding: "24px 28px", marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div>
              <strong style={{ display: "block", marginBottom: 4 }}>Save compare history</strong>
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-ink-muted)" }}>Upgrade to Pro to save all your comparisons and re-run them anytime.</p>
            </div>
            <UpgradeButton plan="pro" className="btn btn-primary">Upgrade to Pro</UpgradeButton>
          </section>
        )}

        {isPro && historyLoaded && (
          <section className="surface dashboard-reports" style={{ marginTop: 16 }}>
            <div className="dashboard-section-header">
              <div><h2>Compare history</h2></div>
            </div>
            {history.length ? (
              <div className="dashboard-report-list">
                {history.map(run => (
                  <div className="dashboard-report-row" key={run.id}>
                    <div className="dashboard-report-link" style={{ cursor: "default" }}>
                      <div>
                        <strong style={{ fontSize: 13 }}>{run.url_a}</strong>
                        <span style={{ color: "var(--color-ink-muted)", fontSize: 12 }}>vs {run.url_b}</span>
                        <span>{formatDate(run.created_at)} · {run.score_a ?? "—"} vs {run.score_b ?? "—"}</span>
                      </div>
                    </div>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: 13, padding: "6px 14px" }} onClick={() => prefill(run)}>
                      Re-run
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <p>No comparisons saved yet. Run a comparison above to see results here.</p>
              </div>
            )}
          </section>
        )}

      </section>
      <SiteFooter />
    </main>
  );
}
