"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileSearch,
  LayoutDashboard,
  Loader2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import UpgradeButton from "../components/UpgradeButton";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { isMasterAdmin } from "@/lib/access";

type RecentAudit = {
  id: string;
  domain: string;
  aggregate_score: number | null;
  status: string;
  created_at: string;
};

type AccountData = {
  profile: {
    id: string;
    email: string;
    plan: "guest" | "free" | "onetime" | "pro" | "agency";
    isAdmin?: boolean;
  };
  usage: {
    count: number;
    limit: number;
    remaining: number | null;
    unlimited: boolean;
  };
  reports: Array<{
    id: string;
    url: string;
    score: number;
    created_at: string;
    retest_count?: number;
    max_retests?: number;
    unlocked?: boolean;
  }>;
  recentAudits: RecentAudit[];
  monitorCount: number;
};

function planLabel(plan: AccountData["profile"]["plan"]) {
  if (plan === "agency") return "Agency";
  if (plan === "pro") return "Pro";
  if (plan === "onetime") return "Full Report";
  return "Free";
}

function monitorLimit(plan: AccountData["profile"]["plan"]): number | null {
  if (plan === "agency") return null;
  if (plan === "pro") return 10;
  if (plan === "onetime") return 5;
  return 1;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function DashboardClient() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      if (!supabase) {
        setError("Supabase auth is not configured.");
        setLoading(false);
        return;
      }

      const token = (await getSafeSupabaseSession(supabase))?.access_token;

      if (!token) {
        router.replace("/login?next=/dashboard");
        return;
      }

      const res = await fetch("/api/account", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!active) return;

      if (!res.ok) {
        setError("We could not load your dashboard. Please log in again.");
        setLoading(false);
        return;
      }

      setAccount((await res.json()) as AccountData);
      setLoading(false);
    }

    loadAccount();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  const usagePercent = useMemo(() => {
    if (!account || account.usage.unlimited) return 100;
    return Math.min(100, Math.round((account.usage.count / account.usage.limit) * 100));
  }, [account]);

  const masterAdmin = account ? isMasterAdmin({ plan: account.profile.plan, isAdmin: account.profile.isAdmin }) : false;
  const paidPlan = account ? account.profile.plan === "pro" || account.profile.plan === "agency" || account.profile.plan === "onetime" : false;
  const shouldShowUpgradeCard = Boolean(account) && !masterAdmin && !paidPlan;
  const shouldShowPricingCta = shouldShowUpgradeCard;
  const hasUnlockedOneTimeReports = Boolean(account?.reports.some((report) => report.unlocked));

  const scanCountLabel = account && masterAdmin
    ? "Master Admin · Unlimited Access"
    : account?.usage.unlimited
      ? "Pro · Unlimited Access"
      : account
        ? `${account.usage.remaining} free scans left this month`
        : undefined;

  return (
    <main className="min-h-screen">
      <SiteHeader scanCountLabel={scanCountLabel} />

      <section className="dashboard-page app-container">
        {loading && (
          <div className="surface dashboard-loading">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading your workspace
          </div>
        )}

        {!loading && error && (
          <div className="surface dashboard-error">
            <strong>Dashboard unavailable</strong>
            <p>{error}</p>
            <a href="/login?next=/dashboard" className="btn btn-secondary">Log in again</a>
          </div>
        )}

        {!loading && account && (
          <>
            <div className="dashboard-hero">
              <div>
                <span className="launch-eyebrow"><LayoutDashboard className="h-4 w-4" /> Account dashboard</span>
                <h1>Manage your AEOCheck workspace.</h1>
                <p>Track scan usage, review saved reports, and manage your plan from one place.</p>
              </div>
              <a href="/#scanner" className="btn btn-primary">Scan a URL</a>
            </div>

            <div className="dashboard-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              {account.profile.isAdmin && (
                <section className="surface dashboard-card dashboard-admin-card">
                  <div className="dashboard-card-title">
                    <span className="icon-tile"><ShieldCheck className="h-5 w-5" /></span>
                    <div>
                      <h2>Owner admin</h2>
                      <p>Private app controls.</p>
                    </div>
                  </div>
                  <strong className="dashboard-plan-name">Admin</strong>
                  <p className="dashboard-plan-copy">View users, scan activity, paid accounts, and recent reports.</p>
                  <a href="/admin" className="btn btn-secondary">Open admin</a>
                </section>
              )}

              <section className="surface dashboard-card dashboard-profile-card">
                <div className="dashboard-card-title">
                  <span className="icon-tile"><UserRound className="h-5 w-5" /></span>
                  <div>
                    <h2>Profile</h2>
                    <p>Your signed-in account.</p>
                  </div>
                </div>
                <div className="dashboard-profile-email">{account.profile.email}</div>
                <div className="dashboard-meta-row">
                  <span>Account ID</span>
                  <strong>{account.profile.id.slice(0, 8)}</strong>
                </div>
              </section>

              <section className="surface dashboard-card dashboard-plan-card">
                <div className="dashboard-card-title">
                  <span className="icon-tile"><CreditCard className="h-5 w-5" /></span>
                  <div>
                    <h2>Plan</h2>
                    <p>Current access level.</p>
                  </div>
                </div>
                <strong className="dashboard-plan-name">{planLabel(account.profile.plan)}</strong>
                {masterAdmin && <p className="dashboard-plan-copy">Master Admin · Unlimited Access</p>}
                <p className="dashboard-plan-copy">
                  {account.usage.unlimited
                    ? "Unlimited scans are active for this workspace."
                    : "Free accounts include 3 scans per month."}
                </p>
                {!account.usage.unlimited && hasUnlockedOneTimeReports && (
                  <p className="dashboard-plan-copy">Free account. Some reports may be unlocked individually.</p>
                )}
                {shouldShowPricingCta && <a href="/#pricing" className="btn btn-secondary">View pricing</a>}
              </section>

              <section className="surface dashboard-card dashboard-usage-card" style={{ display: "flex", flexDirection: "column" }}>
                <div className="dashboard-card-title">
                  <span className="icon-tile"><BarChart3 className="h-5 w-5" /></span>
                  <div>
                    <h2>Scans</h2>
                    <p>Resets at the start of each month.</p>
                  </div>
                </div>
                <div className="dashboard-usage-number">
                  <strong>{account.usage.count}</strong>
                  <span>{account.usage.unlimited ? "used this month" : `of ${account.usage.limit} used`}</span>
                </div>
                <div className="dashboard-progress" aria-hidden="true">
                  <span style={{ width: `${usagePercent}%` }} />
                </div>
                <p className="muted-copy">
                  {account.usage.unlimited
                    ? "Your plan is not capped by the free monthly limit."
                    : `${account.usage.remaining} scans remaining this month.`}
                </p>
                <a href="/scan" className="btn btn-secondary" style={{ marginTop: "auto" }}>View all →</a>
              </section>

              {shouldShowUpgradeCard && (
                <section className="surface dashboard-card dashboard-upgrade-card">
                  <div className="dashboard-card-title">
                    <span className="icon-tile"><CheckCircle2 className="h-5 w-5" /></span>
                    <div>
                      <h2>Upgrade options</h2>
                      <p>For teams that scan often.</p>
                    </div>
                  </div>
                  <ul>
                    <li>Unlimited scan allowance</li>
                    <li>Saved report history</li>
                  </ul>
                  <UpgradeButton plan="pro">Upgrade plan</UpgradeButton>
                </section>
              )}
            </div>

            <div className="dashboard-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              <section className="surface dashboard-card" style={{ display: "flex", flexDirection: "column" }}>
                <div className="dashboard-card-title">
                  <span className="icon-tile"><FileSearch className="h-5 w-5" /></span>
                  <div><h2>Audits</h2><p>Site audits run</p></div>
                </div>
                <div className="dashboard-usage-number" style={{ flex: 1 }}>
                  <strong>{account.recentAudits.length}{account.recentAudits.length === 5 ? "+" : ""}</strong>
                  <span>site audits run</span>
                </div>
                <a href="/audit" className="btn btn-secondary" style={{ marginTop: "auto" }}>New audit →</a>
              </section>

              <section className="surface dashboard-card" style={{ display: "flex", flexDirection: "column" }}>
                <div className="dashboard-card-title">
                  <span className="icon-tile"><Activity className="h-5 w-5" /></span>
                  <div><h2>Monitor</h2><p>Tracked URLs</p></div>
                </div>
                <div className="dashboard-usage-number" style={{ flex: 1 }}>
                  <strong>{account.monitorCount}</strong>
                  <span>{monitorLimit(account.profile.plan) === null ? "unlimited" : `of ${monitorLimit(account.profile.plan)} URLs tracked`}</span>
                </div>
                <a href="/monitor" className="btn btn-secondary" style={{ marginTop: "auto" }}>Open Monitor →</a>
              </section>

              <section className="surface dashboard-card" style={{ display: "flex", flexDirection: "column" }}>
                <div className="dashboard-card-title">
                  <span className="icon-tile"><ArrowLeftRight className="h-5 w-5" /></span>
                  <div><h2>Compare</h2><p>Side-by-side analysis</p></div>
                </div>
                <p className="dashboard-plan-copy" style={{ flex: 1 }}>Analyze any two URLs head to head.</p>
                <a href="/compare" className="btn btn-secondary" style={{ marginTop: "auto" }}>Compare URLs →</a>
              </section>
            </div>

            <section className="surface dashboard-reports">
              <div className="dashboard-section-header">
                <div>
                  <h2>Recent scans</h2>
                </div>
                <a href="/#scanner" className="btn btn-secondary">New scan</a>
              </div>

              {account.reports.length ? (
                <div className="dashboard-report-list">
                  {account.reports.map((report) => (
                    <div className="dashboard-report-row" key={report.id}>
                      <a href={`/report?id=${report.id}`} className="dashboard-report-link">
                        <div>
                          <strong>{report.url}</strong>
                          <span>
                            {formatDate(report.created_at)}
                            {report.unlocked ? " · Full Report" : ""}
                          </span>
                        </div>
                        <em>{report.score}</em>
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                      {report.unlocked && (
                        <button
                          type="button"
                          className="btn btn-secondary dashboard-retest-btn"
                          onClick={() => router.push(`/report?id=${encodeURIComponent(report.id)}`)}
                        >
                          Retest
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty-state">
                  <ExternalLink className="h-5 w-5" />
                  <strong>No saved reports yet</strong>
                  <p>Run your first scan while logged in and it will appear here automatically.</p>
                </div>
              )}
            </section>

            <section className="surface dashboard-reports">
              <div className="dashboard-section-header">
                <div>
                  <h2>Site audits</h2>
                </div>
                <a href="/audit" className="btn btn-secondary">New audit</a>
              </div>
              {account.recentAudits.length ? (
                <div className="dashboard-report-list">
                  {account.recentAudits.map((audit) => (
                    <div className="dashboard-report-row" key={audit.id}>
                      <a href={`/audit/${audit.id}`} className="dashboard-report-link">
                        <div>
                          <strong>{audit.domain}</strong>
                          <span>{formatDate(audit.created_at)} · {audit.status}</span>
                        </div>
                        {audit.aggregate_score !== null && <em>{audit.aggregate_score}</em>}
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dashboard-empty-state">
                  <FileSearch className="h-5 w-5" />
                  <strong>No audits yet</strong>
                  <p>Run a multi-page site audit and it will appear here.</p>
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
