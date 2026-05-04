"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Crown, ExternalLink, Loader2, ShieldCheck, UsersRound } from "lucide-react";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AdminData = {
  stats: {
    users: number;
    proUsers: number;
    reports: number;
    todayScans: number;
  };
  recentReports: Array<{
    id: string;
    url: string;
    score: number;
    created_at: string;
    user_id: string | null;
  }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminClient() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadAdmin() {
      if (!supabase) {
        setError("Supabase auth is not configured.");
        setLoading(false);
        return;
      }

      const token = (await getSafeSupabaseSession(supabase))?.access_token;
      if (!token) {
        router.replace("/login?next=/admin");
        return;
      }

      const res = await fetch("/api/admin/summary", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!active) return;

      if (res.status === 403) {
        setError("This account does not have owner admin access.");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError("Admin data could not be loaded.");
        setLoading(false);
        return;
      }

      setData((await res.json()) as AdminData);
      setLoading(false);
    }

    loadAdmin();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <section className="dashboard-page app-container">
        {loading && (
          <div className="surface dashboard-loading">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading owner admin
          </div>
        )}

        {!loading && error && (
          <div className="surface dashboard-error">
            <strong>Owner admin unavailable</strong>
            <p>{error}</p>
            <a href="/dashboard" className="btn btn-secondary">Back to dashboard</a>
          </div>
        )}

        {!loading && data && (
          <>
            <div className="dashboard-hero admin-hero">
              <div>
                <span className="launch-eyebrow"><ShieldCheck className="h-4 w-4" /> Owner admin</span>
                <h1>Monitor AnswerRank activity.</h1>
                <p>Review usage, customers, scans, and recent reports from one private workspace.</p>
              </div>
              <a href="/dashboard" className="btn btn-secondary">Account dashboard</a>
            </div>

            <div className="dashboard-grid admin-stat-grid">
              <section className="surface dashboard-card admin-stat-card">
                <span className="icon-tile"><UsersRound className="h-5 w-5" /></span>
                <span>Total users</span>
                <strong>{data.stats.users}</strong>
              </section>
              <section className="surface dashboard-card admin-stat-card">
                <span className="icon-tile"><Crown className="h-5 w-5" /></span>
                <span>Paid users</span>
                <strong>{data.stats.proUsers}</strong>
              </section>
              <section className="surface dashboard-card admin-stat-card">
                <span className="icon-tile"><BarChart3 className="h-5 w-5" /></span>
                <span>Scans today</span>
                <strong>{data.stats.todayScans}</strong>
              </section>
              <section className="surface dashboard-card admin-stat-card">
                <span className="icon-tile"><ExternalLink className="h-5 w-5" /></span>
                <span>Saved reports</span>
                <strong>{data.stats.reports}</strong>
              </section>
            </div>

            <section className="surface dashboard-reports">
              <div className="dashboard-section-header">
                <div>
                  <span className="launch-eyebrow">Latest activity</span>
                  <h2>Recent reports</h2>
                </div>
              </div>

              {data.recentReports.length ? (
                <div className="dashboard-report-list">
                  {data.recentReports.map((report) => (
                    <a href={`/report?id=${report.id}`} className="dashboard-report-row" key={report.id}>
                      <div>
                        <strong>{report.url}</strong>
                        <span>{formatDate(report.created_at)}</span>
                      </div>
                      <em>{report.score}</em>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty-state">
                  <ExternalLink className="h-5 w-5" />
                  <strong>No reports yet</strong>
                  <p>Saved reports will appear here as scans are created.</p>
                </div>
              )}
            </section>
          </>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
