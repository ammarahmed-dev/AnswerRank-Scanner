"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  Loader2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import UpgradeButton from "../components/UpgradeButton";
import CompareWorkbench from "../components/CompareWorkbench";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { isMasterAdmin } from "@/lib/access";

type AccountData = {
  profile: {
    id: string;
    email: string;
    plan: "guest" | "free" | "pro" | "agency";
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
};

function planLabel(plan: AccountData["profile"]["plan"]) {
  if (plan === "agency") return "Agency";
  if (plan === "pro") return "Pro";
  return "Free";
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
  const paidPlan = account ? account.profile.plan === "pro" || account.profile.plan === "agency" : false;
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

            <div className="dashboard-grid">
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

              <section className="surface dashboard-card dashboard-usage-card">
                <div className="dashboard-card-title">
                  <span className="icon-tile"><BarChart3 className="h-5 w-5" /></span>
                  <div>
                    <h2>Monthly scans</h2>
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
                  <UpgradeButton checkoutType="pro_plan">Upgrade plan</UpgradeButton>
                </section>
              )}
            </div>

            <section className="surface dashboard-reports">
              <div className="dashboard-section-header">
                <div>
                  <span className="launch-eyebrow">Recent reports</span>
                  <h2>Saved scans</h2>
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

            <CompareWorkbench />
          </>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
