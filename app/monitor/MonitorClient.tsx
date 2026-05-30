"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Globe,
  Loader2,
  Trash2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Plus,
} from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import UpgradeButton from "../components/UpgradeButton";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { isMasterAdmin, isProUser } from "@/lib/access";
import { useAuth } from "@/app/context/AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────────

type MonitorItem = {
  id: string;
  url: string;
  label: string | null;
  frequency: "weekly" | "monthly";
  last_scanned_at: string | null;
  created_at: string;
  latest_score: number | null;
  latest_category_scores: Record<string, number> | null;
  previous_score: number | null;
  score_delta: number | null;
};

type Snapshot = {
  id: string;
  score: number;
  category_scores: Record<string, number> | null;
  scanned_at: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  metadata: "Metadata",
  headings: "Headings",
  schema: "Schema",
  contentClarity: "Content Clarity",
  aiReadiness: "AI Readiness",
  performance: "Performance",
  trustSignals: "Trust Signals",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function scoreGrade(score: number) {
  if (score >= 80) return { grade: "A", cls: "monitor-grade-a" };
  if (score >= 65) return { grade: "B", cls: "monitor-grade-b" };
  if (score >= 50) return { grade: "C", cls: "monitor-grade-c" };
  return { grade: "D", cls: "monitor-grade-d" };
}

// ── SVG Sparkline ─────────────────────────────────────────────────────────────

const CHART_W = 480;
const CHART_H = 100;
const PAD_X = 14;
const PAD_Y = 12;

function ScoreSparkline({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length === 0) {
    return <p className="monitor-chart-hint">No scans yet. Click Scan Now to start tracking.</p>;
  }
  if (snapshots.length === 1) {
    return <p className="monitor-chart-hint">Need at least 2 scans to show a trend. Run another scan.</p>;
  }

  const innerW = CHART_W - PAD_X * 2;
  const innerH = CHART_H - PAD_Y * 2;

  const scores = snapshots.map((s) => s.score);
  const rawMin = Math.min(...scores);
  const rawMax = Math.max(...scores);
  const spread = rawMax === rawMin ? 20 : rawMax - rawMin;
  const yMin = Math.max(0, rawMin - Math.ceil(spread * 0.2));
  const yMax = Math.min(100, rawMax + Math.ceil(spread * 0.2));
  const yRange = yMax - yMin || 20;

  const pts = snapshots.map((snap, i) => ({
    x: PAD_X + (i / (snapshots.length - 1)) * innerW,
    y: PAD_Y + innerH - ((snap.score - yMin) / yRange) * innerH,
    score: snap.score,
    date: snap.scanned_at,
  }));

  const polyPoints = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const last = scores[scores.length - 1];
  const first = scores[0];
  const isUp = last >= first;
  const stroke = isUp ? "var(--color-success)" : "var(--color-danger)";

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="monitor-sparkline"
      role="img"
      aria-label="AEO score trend"
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polyPoints}
      />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="5" fill={stroke} opacity="0.25" />
          <circle cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3" fill={stroke} />
        </g>
      ))}
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function MonitorClient() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const { user, plan, isAdmin, loading: authLoading } = useAuth();
  const tokenRef = useRef<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<MonitorItem[]>([]);
  const [addUrl, setAddUrl] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyMap, setHistoryMap] = useState<Record<string, Snapshot[]>>({});
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);

  async function getToken() {
    if (!supabase) return null;
    const session = await getSafeSupabaseSession(supabase);
    return session?.access_token ?? null;
  }

  async function authFetch(path: string, init?: RequestInit) {
    const token = tokenRef.current;
    return fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
  }

  async function loadItems(token: string) {
    const res = await fetch("/api/monitor", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      setError("Could not load monitored URLs.");
      return;
    }
    const data = (await res.json()) as { items: MonitorItem[] };
    setItems(data.items);
  }

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login?next=/monitor");
      return;
    }

    let cancelled = false;

    async function init() {
      const token = await getToken();
      if (cancelled) return;
      if (!token) {
        setLoading(false);
        return;
      }
      tokenRef.current = token;

      const proCheck =
        isMasterAdmin({ plan, isAdmin }) || isProUser({ plan, isAdmin });

      if (proCheck) {
        await loadItems(token);
      }

      if (!cancelled) setLoading(false);
    }

    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, plan, isAdmin]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");
    const raw = addUrl.trim();
    if (!raw) return;
    setAddLoading(true);

    const res = await authFetch("/api/monitor", {
      method: "POST",
      body: JSON.stringify({ url: raw }),
    });

    setAddLoading(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({ error: "Failed." }))) as { error?: string };
      setAddError(data.error ?? "Failed to add URL.");
      return;
    }

    setAddUrl("");
    await loadItems(tokenRef.current);
  }

  async function handleScan(id: string) {
    setScanningId(id);
    const res = await authFetch(`/api/monitor/${id}/scan`, { method: "POST" });
    setScanningId(null);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({ error: "Scan failed." }))) as { error?: string };
      alert(data.error ?? "Scan failed.");
      return;
    }

    // Refresh list and clear cached history so the chart updates
    setHistoryMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await loadItems(tokenRef.current);

    // If this row is expanded, reload its history
    if (expandedId === id) {
      await loadHistory(id);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this URL from monitoring? Its score history will be deleted.")) return;
    setDeletingId(id);
    const res = await authFetch(`/api/monitor/${id}`, { method: "DELETE" });
    setDeletingId(null);

    if (!res.ok) {
      alert("Delete failed. Please try again.");
      return;
    }

    if (expandedId === id) setExpandedId(null);
    setItems((prev) => prev.filter((item) => item.id !== id));
    setHistoryMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function handleFreqChange(id: string, frequency: "weekly" | "monthly") {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, frequency } : item))
    );
    await authFetch(`/api/monitor/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ frequency }),
    });
  }

  async function loadHistory(id: string) {
    if (historyMap[id]) return;
    setHistoryLoading(id);
    const res = await authFetch(`/api/monitor/${id}/history`);
    setHistoryLoading(null);
    if (!res.ok) return;
    const data = (await res.json()) as { snapshots: Snapshot[] };
    setHistoryMap((prev) => ({ ...prev, [id]: data.snapshots }));
  }

  async function handleToggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    await loadHistory(id);
  }

  // ── Derived state ────────────────────────────────────────────────────────────

  const isPro =
    !authLoading &&
    user != null &&
    (isMasterAdmin({ plan, isAdmin }) || isProUser({ plan, isAdmin }));

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <section className="app-container monitor-page">
        {loading && (
          <div className="page-loading">
            <div className="page-loading-spinner" />
            <span>Loading Monitor</span>
          </div>
        )}

        {!loading && error && (
          <div className="monitor-error surface card-pad">
            <strong>Could not load Monitor</strong>
            <p>{error}</p>
            <a href="/login?next=/monitor" className="btn btn-secondary">Log in again</a>
          </div>
        )}

        {!loading && !error && !isPro && (
          <div className="monitor-gate surface card-pad">
            <div className="monitor-gate-inner">
              <TrendingUp className="h-10 w-10 monitor-gate-icon" />
              <h1>Monitor your AEO score over time</h1>
              <p>
                Monitor is a Pro feature. Add URLs to track, get weekly or monthly score snapshots,
                and see your AI search visibility trend over time.
              </p>
              <ul className="monitor-gate-features">
                <li>Track up to 10 URLs</li>
                <li>Weekly or monthly automated rescans</li>
                <li>Score trend charts</li>
                <li>Category breakdown per scan</li>
              </ul>
              <UpgradeButton plan="pro">Upgrade to Pro</UpgradeButton>
              <a href="/#pricing" className="monitor-gate-pricing-link">View pricing</a>
            </div>
          </div>
        )}

        {!loading && !error && isPro && (
          <>
            <div className="monitor-hero">
              <div>
                <span className="launch-eyebrow"><TrendingUp className="h-4 w-4" /> Score Monitor</span>
                <h1>Track your AEO score over time.</h1>
                <p>Add URLs to monitor. Scan manually or let automated rescans run weekly or monthly.</p>
              </div>
              <Link href="/dashboard" className="btn btn-secondary">Dashboard</Link>
            </div>

            {/* Add URL form */}
            <form className="monitor-add-form surface card-pad" onSubmit={handleAdd}>
              <div className="monitor-add-row">
                <div className="monitor-add-input-wrap">
                  <Globe className="h-4 w-4" />
                  <input
                    type="text"
                    value={addUrl}
                    onChange={(e) => setAddUrl(e.target.value)}
                    placeholder="https://yourwebsite.com"
                    disabled={addLoading}
                    aria-label="URL to monitor"
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={addLoading || !addUrl.trim()}
                >
                  {addLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Adding...</>
                  ) : (
                    <><Plus className="h-4 w-4" /> Start Monitoring</>
                  )}
                </button>
              </div>
              {addError && <p className="monitor-add-error">{addError}</p>}
              <p className="monitor-add-hint">Up to 10 URLs. Scans run on your schedule or manually.</p>
            </form>

            {/* URL list */}
            {items.length === 0 ? (
              <div className="monitor-empty surface card-pad">
                <Globe className="h-8 w-8 monitor-empty-icon" />
                <strong>No URLs monitored yet</strong>
                <p>Add your first URL above to start tracking your AEO score over time.</p>
              </div>
            ) : (
              <div className="monitor-list">
                {items.map((item) => {
                  const isExpanded = expandedId === item.id;
                  const isScanning = scanningId === item.id;
                  const isDeleting = deletingId === item.id;
                  const { grade, cls } = item.latest_score != null
                    ? scoreGrade(item.latest_score)
                    : { grade: "—", cls: "" };
                  const snapshots = historyMap[item.id] ?? [];
                  const isHistLoading = historyLoading === item.id;

                  return (
                    <div key={item.id} className={`monitor-row surface${isExpanded ? " monitor-row-expanded" : ""}`}>
                      {/* Main row */}
                      <div className="monitor-row-main">
                        <div className="monitor-row-identity">
                          <span className={`monitor-grade-badge ${cls}`}>{grade}</span>
                          <div className="monitor-row-url-block">
                            <strong className="monitor-row-url monitor-row-url-full">{item.url}</strong>
                            <strong className="monitor-row-url monitor-row-url-short" aria-hidden="true">{stripUrl(item.url)}</strong>
                            <span className="monitor-row-meta">
                              {item.last_scanned_at
                                ? `Last scanned ${formatDate(item.last_scanned_at)}`
                                : "Not scanned yet"}
                            </span>
                          </div>
                        </div>

                        <div className="monitor-row-score-block">
                          {item.latest_score != null && (
                            <span className="monitor-score-number">{item.latest_score}</span>
                          )}
                          {item.score_delta != null && item.score_delta !== 0 && (
                            <span className={`monitor-delta ${item.score_delta > 0 ? "monitor-delta-up" : "monitor-delta-down"}`}>
                              {item.score_delta > 0
                                ? <TrendingUp className="h-3.5 w-3.5" />
                                : <TrendingDown className="h-3.5 w-3.5" />}
                              {item.score_delta > 0 ? "+" : ""}{item.score_delta}
                            </span>
                          )}
                        </div>

                        <div className="monitor-freq-toggle">
                          <button
                            type="button"
                            className={item.frequency === "weekly" ? "active" : ""}
                            onClick={() => handleFreqChange(item.id, "weekly")}
                            aria-pressed={item.frequency === "weekly"}
                          >
                            Weekly
                          </button>
                          <button
                            type="button"
                            className={item.frequency === "monthly" ? "active" : ""}
                            onClick={() => handleFreqChange(item.id, "monthly")}
                            aria-pressed={item.frequency === "monthly"}
                          >
                            Monthly
                          </button>
                        </div>

                        <div className="monitor-row-actions">
                          <button
                            type="button"
                            className="btn btn-secondary monitor-scan-btn"
                            onClick={() => handleScan(item.id)}
                            disabled={isScanning || isDeleting}
                            title="Run a new scan now"
                          >
                            {isScanning
                              ? <><Loader2 className="h-4 w-4 animate-spin" /><span className="monitor-btn-label"> Scanning</span></>
                              : <><RefreshCw className="h-4 w-4" /><span className="monitor-btn-label"> Scan Now</span></>}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleToggleExpand(item.id)}
                            title={isExpanded ? "Collapse" : "Show history"}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            <span className="monitor-btn-label">History</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger monitor-delete-btn"
                            onClick={() => handleDelete(item.id)}
                            disabled={isDeleting || isScanning}
                            title="Remove from monitoring"
                          >
                            {isDeleting
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded history panel */}
                      {isExpanded && (
                        <div className="monitor-history-panel">
                          <div className="monitor-chart-wrap">
                            <p className="monitor-chart-label">Score trend — last {Math.min(snapshots.length, 10)} scans</p>
                            {isHistLoading ? (
                              <div className="monitor-chart-loading">
                                <Loader2 className="h-5 w-5 animate-spin" />
                              </div>
                            ) : (
                              <ScoreSparkline snapshots={snapshots} />
                            )}
                          </div>

                          {item.latest_category_scores && Object.keys(item.latest_category_scores).length > 0 && (
                            <div className="monitor-cat-grid">
                              <p className="monitor-cat-label">Latest category scores</p>
                              <div className="monitor-cat-rows">
                                {Object.entries(item.latest_category_scores).map(([key, val]) => (
                                  <div key={key} className="monitor-cat-row">
                                    <span>{CATEGORY_LABELS[key] ?? key}</span>
                                    <span className="monitor-cat-score">{val}</span>
                                    <div className="monitor-cat-bar">
                                      <span style={{ width: `${val}%` }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
