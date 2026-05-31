"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2 } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import LoadingState from "../components/LoadingState";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/app/context/AuthContext";

type ProgressStatus = "started" | "complete" | "skipped" | "error";
type LoaderProgress = {
  step: number;
  label: string;
  status: ProgressStatus;
};

type RecentScan = {
  id: string;
  url: string;
  score: number;
  created_at: string;
  unlocked?: boolean;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function ScanClient() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const { user, plan } = useAuth();
  const isPro = plan === "pro" || plan === "agency";
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [retestingId, setRetestingId] = useState<string | null>(null);
  const [retestDoneId, setRetestDoneId] = useState<string | null>(null);
  const [loaderProgress, setLoaderProgress] = useState<LoaderProgress>({ step: 1, label: "Preparing scan", status: "started" });
  const [isClient, setIsClient] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!user || !supabase) return;
    let active = true;
    (async () => {
      const token = (await getSafeSupabaseSession(supabase))?.access_token;
      if (!token || !active) return;
      const res = await fetch("/api/account", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok || !active) return;
      const data = (await res.json()) as { reports: RecentScan[] };
      setRecentScans(data.reports ?? []);
    })();
    return () => { active = false; };
  }, [user, supabase]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) { inputRef.current?.focus(); return; }
    setLoading(true);
    setError("");
    setStatus("Preparing scan...");
    setLoaderProgress({ step: 1, label: "Preparing scan", status: "started" });

    try {
      const token = supabase ? (await getSafeSupabaseSession(supabase))?.access_token : undefined;
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url: trimmed, includeAI: true }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) { setError("Could not read scan response."); setLoading(false); return; }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string;
              label?: string;
              message?: string;
              step?: number;
              status?: string;
              result?: { reportId?: string };
            };
            if (event.type === "progress") {
              const nextLabel = event.message || event.label || "Running scan...";
              const nextStep = typeof event.step === "number" ? event.step : 1;
              const nextStatus = (event.status as ProgressStatus | undefined) || "started";
              setStatus(nextLabel);
              setLoaderProgress({ step: nextStep, label: nextLabel, status: nextStatus });
            }
            if (event.type === "error") {
              setError(event.message ?? "Scan failed.");
              setLoading(false);
              return;
            }
            if (event.type === "result") {
              const id = event.result?.reportId;
              if (id) {
                router.push(`/report?id=${encodeURIComponent(id)}`);
              } else {
                setError("Scan finished but no report was generated.");
                setLoading(false);
              }
              return;
            }
          } catch { /* skip malformed SSE line */ }
        }
      }
    } catch {
      setError("Scan failed. Please check the URL and try again.");
      setLoading(false);
    }
  };

  const refreshScans = async (token: string) => {
    const res = await fetch("/api/account", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { reports: RecentScan[] };
      setRecentScans(data.reports ?? []);
    }
  };

  const handleRetest = async (scanId: string) => {
    if (!supabase || retestingId) return;
    setRetestingId(scanId);
    setRetestDoneId(null);
    try {
      const token = (await getSafeSupabaseSession(supabase))?.access_token;
      if (!token) { setRetestingId(null); return; }
      const res = await fetch(`/api/reports/${encodeURIComponent(scanId)}/retest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRetestDoneId(scanId);
        await refreshScans(token);
      }
    } catch { /* ignore */ }
    setRetestingId(null);
  };

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="dashboard-page app-container">

        <div className="dashboard-hero">
          <div>
            <span className="launch-eyebrow">URL Scanner</span>
            <h1>Scan a URL</h1>
            <p>Check your AI visibility score in 60 seconds.</p>
          </div>
          <Link href="/dashboard" className="btn btn-secondary">Dashboard</Link>
        </div>

        <section className="surface" style={{ padding: "20px 24px 24px" }}>
          <form onSubmit={handleScan} className="scanner-input-row">
            <div className="hero-input-wrap">
              <input
                ref={inputRef}
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
                disabled={loading}
                style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent", WebkitAppearance: "none" }}
              />
            </div>
            <button type="submit" className="btn btn-primary scanner-submit-btn" disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Scanning…" : "Scan URL"}
            </button>
          </form>
          {loading && status && <p style={{ marginTop: 12, fontSize: 13, color: "var(--color-ink-muted)" }}>{status}</p>}
          {error && <p style={{ marginTop: 12, fontSize: 13, color: "#f87171" }}>{error}</p>}
        </section>

        {!user && (
          <div className="surface" style={{ padding: "20px 24px", marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--color-ink-muted)" }}>Sign up free to save your scan history.</p>
            <a href="/signup" className="btn btn-secondary">Sign up free</a>
          </div>
        )}

        {user && (
          <section className="surface dashboard-reports" style={{ marginTop: 16 }}>
            <div className="dashboard-section-header">
              <div><h2>Recent scans</h2></div>
            </div>
            {recentScans.length ? (
              <div className="dashboard-report-list">
                {recentScans.map(scan => (
                  <div className="dashboard-report-row" key={scan.id}>
                    <a href={`/report?id=${scan.id}`} className="dashboard-report-link">
                      <div>
                        <strong>{scan.url}</strong>
                        <span>{formatDate(scan.created_at)}{scan.unlocked ? " · Full Report" : ""}</span>
                      </div>
                      <em>{scan.score}</em>
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                    {isPro && (
                      <button
                        type="button"
                        className="btn btn-secondary dashboard-retest-btn"
                        disabled={retestingId === scan.id}
                        onClick={() => handleRetest(scan.id)}
                      >
                        {retestingId === scan.id ? "Retesting…" : retestDoneId === scan.id ? "Done ✓" : "Retest"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <p>No scans yet. Enter a URL above to get started.</p>
              </div>
            )}
          </section>
        )}

      </section>
      {isClient && loading && createPortal(
        <div className="loading-overlay" role="dialog" aria-modal="true" aria-label="Running AI visibility scan">
          <div className="loading-dialog">
            <LoadingState progress={loaderProgress} />
          </div>
        </div>,
        document.body
      )}

      <SiteFooter />
    </main>
  );
}

