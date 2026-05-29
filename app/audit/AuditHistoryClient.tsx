"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, LayoutGrid, Loader2 } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import { useAuth } from "../context/AuthContext";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuditSummary = {
  id: string;
  domain: string;
  status: string;
  total_pages: number;
  scanned_pages: number;
  aggregate_score: number | null;
  created_at: string;
  completed_at: string | null;
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function statusBadge(status: string) {
  if (status === "completed") return <span className="audit-status audit-status-done">Done</span>;
  if (status === "running") return <span className="audit-status audit-status-running">Running</span>;
  if (status === "failed") return <span className="audit-status audit-status-failed">Failed</span>;
  return <span className="audit-status audit-status-pending">Pending</span>;
}

export default function AuditHistoryClient() {
  const router = useRouter();
  const { user, plan, isAdmin, loading: authLoading } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const [audits, setAudits] = useState<AuditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canAudit = isAdmin || plan === "pro" || plan === "agency";

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/audit");
      return;
    }
    if (!canAudit) {
      setLoading(false);
      return;
    }

    let active = true;
    async function loadHistory() {
      const token = (await getSafeSupabaseSession(supabase))?.access_token;
      if (!token) {
        router.replace("/login?next=/audit");
        return;
      }
      const res = await fetch("/api/audit/history", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!active) return;
      if (!res.ok) {
        setError("Could not load audit history.");
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { audits: AuditSummary[] };
      setAudits(data.audits ?? []);
      setLoading(false);
    }

    loadHistory();
    return () => { active = false; };
  }, [authLoading, user, canAudit, router, supabase]);

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <section className="audit-page app-container">
        <div className="dashboard-hero">
          <div>
            <span className="launch-eyebrow"><LayoutGrid className="h-4 w-4" /> Site Audit</span>
            <h1>Multi-page AEO audit.</h1>
            <p>Scan every important page on your site and get a site-wide AEO score.</p>
          </div>
          <a href="/?tab=audit" className="btn btn-primary">Start New Audit</a>
        </div>

        {loading && (
          <div className="audit-loading">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading audit history
          </div>
        )}

        {!loading && !canAudit && (
          <div className="surface pro-placeholder-panel">
            <p>Site Audit is available on Pro and Agency plans.</p>
            <a href="/#pricing" className="btn btn-primary">View Pricing</a>
          </div>
        )}

        {!loading && canAudit && error && (
          <div className="surface audit-error">{error}</div>
        )}

        {!loading && canAudit && !error && (
          <section className="surface dashboard-reports">
            <div className="dashboard-section-header">
              <div>
                <span className="launch-eyebrow">Past audits</span>
                <h2>Audit history</h2>
              </div>
            </div>

            {audits.length === 0 ? (
              <div className="audit-empty-state">
                <LayoutGrid className="h-8 w-8 audit-empty-icon" />
                <strong>No audits yet</strong>
                <p>Scan every page on your site and get a site-wide AEO score with per-page breakdowns.</p>
                <a href="/?tab=audit" className="btn btn-primary">Start your first audit</a>
              </div>
            ) : (
              <div className="audit-history-list">
                {audits.map((audit) => (
                  <div
                    key={audit.id}
                    className="audit-history-row"
                    onClick={() => router.push(`/audit/${audit.id}`)}
                  >
                    <div className="audit-history-info">
                      <strong className="audit-domain">{audit.domain}</strong>
                      <span className="audit-meta">
                        {formatDate(audit.created_at)} · {audit.scanned_pages}/{audit.total_pages} pages
                      </span>
                    </div>
                    <div className="audit-history-right">
                      {statusBadge(audit.status)}
                      {audit.aggregate_score != null && (
                        <em className="audit-score">{audit.aggregate_score}</em>
                      )}
                      <ArrowUpRight className="h-4 w-4 audit-arrow" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
