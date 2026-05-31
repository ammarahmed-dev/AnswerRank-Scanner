"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { ArrowUpRight, FileSearch, Loader2 } from "lucide-react";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import UpgradeButton from "../components/UpgradeButton";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { isMasterAdmin } from "@/lib/access";

type Tab = "overview" | "scans" | "audits" | "settings" | "admin";

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
    portalUrl?: string | null;
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
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

const NAV_TABS: Array<{ id: Tab; emoji: string; label: string }> = [
  { id: "overview", emoji: "🏠", label: "Overview" },
  { id: "scans",    emoji: "🔍", label: "Scans" },
  { id: "audits",   emoji: "📋", label: "Audits" },
  { id: "settings", emoji: "⚙️", label: "Settings" },
];

// ── Shared inline style helpers ──────────────────────────────

const card: React.CSSProperties = {
  background: "#0d1117",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 12,
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const grid3: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 16,
};

const cardLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "rgba(255,255,255,0.4)",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  margin: 0,
};

const cardValue: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 700,
  color: "#fff",
  lineHeight: 1.1,
  margin: 0,
};

const cardDesc: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(255,255,255,0.45)",
  margin: 0,
  lineHeight: 1.5,
};

const cardLink: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(0,229,160,0.85)",
  textDecoration: "none",
};

const sectionHeading: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#fff",
  margin: "0 0 16px",
};

const settingsRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 14,
  padding: "10px 0",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

const settingsLabel: React.CSSProperties = {
  color: "rgba(255,255,255,0.5)",
};

// ── Component ────────────────────────────────────────────────

export default function DashboardClient() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [account, setAccount] = useState<AccountData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    let active = true;
    async function loadAccount() {
      if (!supabase) { setError("Supabase auth is not configured."); setLoading(false); return; }
      const token = (await getSafeSupabaseSession(supabase))?.access_token;
      if (!token) { router.replace("/login?next=/dashboard"); return; }
      const res = await fetch("/api/account", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!active) return;
      if (!res.ok) { setError("We could not load your dashboard. Please log in again."); setLoading(false); return; }
      setAccount((await res.json()) as AccountData);
      setLoading(false);
    }
    loadAccount();
    return () => { active = false; };
  }, [router, supabase]);

  const usagePercent = useMemo(() => {
    if (!account || account.usage.unlimited) return 100;
    return Math.min(100, Math.round((account.usage.count / account.usage.limit) * 100));
  }, [account]);

  const masterAdmin = account ? isMasterAdmin({ plan: account.profile.plan, isAdmin: account.profile.isAdmin }) : false;
  const paidPlan = account ? ["pro", "agency", "onetime"].includes(account.profile.plan) : false;
  const shouldShowUpgradeCard = Boolean(account) && !masterAdmin && !paidPlan;
  const hasUnlockedOneTimeReports = Boolean(account?.reports.some(r => r.unlocked));
  const isPro = account ? (account.profile.plan === "pro" || account.profile.plan === "agency" || masterAdmin) : false;

  const visibleTabs = [
    ...NAV_TABS,
    ...(masterAdmin ? [{ id: "admin" as Tab, emoji: "🛡️", label: "Admin" }] : []),
  ];

  function tabStyle(id: Tab): React.CSSProperties {
    const active = activeTab === id;
    return {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      borderRadius: 8,
      fontSize: 14,
      fontWeight: active ? 600 : 500,
      color: active ? "#00e5a0" : "rgba(255,255,255,0.6)",
      background: active ? "rgba(0,229,160,0.08)" : "transparent",
      cursor: "pointer",
      marginBottom: 2,
      border: "none",
      width: "100%",
      textAlign: "left" as const,
      transition: "background 120ms ease, color 120ms ease",
    };
  }

  function externalTabStyle(): React.CSSProperties {
    return {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 500,
      color: "rgba(255,255,255,0.6)",
      background: "transparent",
      cursor: "pointer",
      marginBottom: 2,
      border: "none",
      width: "100%",
      textAlign: "left" as const,
    };
  }

  // ── Sidebar ─────────────────────────────────────────────────

  function Sidebar() {
    if (!account) return null;
    const initial = account.profile.email.charAt(0).toUpperCase();
    const isPaidPlan = account.profile.plan === "pro" || account.profile.plan === "agency";

    return (
      <>
        {/* User info */}
        <div className="db-user" style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px", marginBottom: 24 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,229,160,0.18)", color: "#00e5a0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
            {initial}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {account.profile.email.length > 22 ? account.profile.email.slice(0, 22) + "…" : account.profile.email}
            </div>
            <span style={{ display: "inline-block", marginTop: 3, fontSize: 11, fontWeight: 600, color: isPaidPlan ? "#00e5a0" : "rgba(255,255,255,0.4)", background: isPaidPlan ? "rgba(0,229,160,0.1)" : "rgba(255,255,255,0.06)", borderRadius: 4, padding: "1px 6px" }}>
              {planLabel(account.profile.plan)}
            </span>
          </div>
        </div>

        {/* Nav tabs */}
        <nav className="db-nav" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          {visibleTabs.map(tab => (
            <button key={tab.id} type="button" className={`db-tab${activeTab === tab.id ? " is-active" : ""}`} style={tabStyle(tab.id)} onClick={() => handleTabChange(tab.id)}>
              <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>{tab.emoji}</span>
              {tab.label}
            </button>
          ))}

          <div className="db-nav-divider" style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "8px 8px" }} />

          <button type="button" className="db-tab" style={externalTabStyle()} onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); router.push("/monitor"); }}>
            <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>📡</span>Monitor
          </button>
          <button type="button" className="db-tab" style={externalTabStyle()} onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); router.push("/compare"); }}>
            <span style={{ fontSize: 15, width: 20, textAlign: "center" }}>⚖️</span>Compare
          </button>
        </nav>

        {/* Bottom CTA */}
        <div className="db-sidebar-bottom" style={{ marginTop: "auto", paddingTop: 16 }}>
          <a href="/scan" className="btn btn-primary" style={{ width: "100%", textAlign: "center", justifyContent: "center", display: "flex" }}>
            Scan a URL
          </a>
        </div>
      </>
    );
  }

  // ── Tab content ──────────────────────────────────────────────

  function OverviewTab() {
    if (!account) return null;
    const portalUrl = account.profile.portalUrl;
    const recentScans = account.reports;
    const recentAudits = account.recentAudits;
    return (
      <>
        {recentScans.length === 0 && recentAudits.length === 0 && (
          <div
            className="onboarding-banner"
            style={{
              background: "linear-gradient(135deg, rgba(0,229,160,0.08), rgba(0,229,160,0.03))",
              border: "1px solid rgba(0,229,160,0.2)",
              borderRadius: "12px",
              padding: "24px 28px",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "24px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#00e5a0",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                Get started
              </div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#ffffff",
                  marginBottom: "6px",
                }}
              >
                Scan your first URL to see your AI visibility score
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.5)",
                  lineHeight: "1.5",
                }}
              >
                Find out if ChatGPT and Perplexity can find your website - takes 60 seconds.
              </div>
            </div>
            <a
              href="/scan"
              style={{
                background: "#00e5a0",
                color: "#000",
                fontWeight: 700,
                fontSize: "14px",
                padding: "12px 24px",
                borderRadius: "8px",
                textDecoration: "none",
                whiteSpace: "nowrap",
                flexShrink: 0,
                width: isMobile ? "100%" : undefined,
                textAlign: isMobile ? ("center" as const) : undefined,
              }}
            >
              Scan a URL &rarr;
            </a>
          </div>
        )}

        <div className="db-grid-3" style={grid3}>
          <div style={card}>
            <p style={cardLabel}>Profile</p>
            <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.85)", wordBreak: "break-all" }}>{account.profile.email}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <span>Account ID</span>
              <strong style={{ fontFamily: "monospace" }}>{account.profile.id.slice(0, 8)}</strong>
            </div>
          </div>

          <div style={card}>
            <p style={cardLabel}>Plan</p>
            <p style={cardValue}>{planLabel(account.profile.plan)}</p>
            <p style={cardDesc}>{masterAdmin ? "Master Admin · Unlimited access." : account.usage.unlimited ? "Unlimited scans active." : "3 scans per month included."}</p>
            {portalUrl
              ? <a href={portalUrl} target="_blank" rel="noopener noreferrer" style={{ ...cardLink, marginTop: 4 }}>Manage subscription →</a>
              : shouldShowUpgradeCard && <a href="/#pricing" style={{ ...cardLink, marginTop: 4 }}>View pricing →</a>}
          </div>

          <div style={card}>
            <p style={cardLabel}>Scans this month</p>
            <p style={cardValue}>
              {account.usage.unlimited ? "∞" : account.usage.count}
              {!account.usage.unlimited && <span style={{ fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,0.4)" }}> / {account.usage.limit}</span>}
            </p>
            <div className="dashboard-progress" style={{ marginTop: 4 }} aria-hidden="true">
              <span style={{ width: `${usagePercent}%` }} />
            </div>
            <a href="/scan" style={{ ...cardLink, marginTop: 4 }}>View all scans →</a>
          </div>
        </div>

        <div className="db-grid-3" style={{ ...grid3, marginTop: 16 }}>
          <div style={card}>
            <p style={cardLabel}>Audits</p>
            <p style={cardValue}>{account.recentAudits.length}{account.recentAudits.length === 5 ? "+" : ""}</p>
            <p style={cardDesc}>Site audits run</p>
            <a href="/audit" className="btn btn-secondary" style={{ marginTop: 8 }}>New audit →</a>
          </div>

          <div style={card}>
            <p style={cardLabel}>Monitor</p>
            <p style={cardValue}>{account.monitorCount}</p>
            <p style={cardDesc}>{monitorLimit(account.profile.plan) === null ? "Unlimited URLs tracked" : `of ${monitorLimit(account.profile.plan)} URLs tracked`}</p>
            <a href="/monitor" className="btn btn-secondary" style={{ marginTop: 8 }}>Open Monitor →</a>
          </div>

          <div style={card}>
            <p style={cardLabel}>Compare</p>
            <p style={{ ...cardDesc, marginTop: 8 }}>Analyze any two URLs head to head.</p>
            <a href="/compare" className="btn btn-secondary" style={{ marginTop: 8 }}>Compare URLs →</a>
          </div>
        </div>
      </>
    );
  }

  function ScansTab() {
    if (!account) return null;
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Recent scans</h1>
          <a href="/scan" className="btn btn-secondary">New scan</a>
        </div>
        {account.reports.length ? (
          <div className="dashboard-report-list">
            {account.reports.map(report => (
              <div className="dashboard-report-row" key={report.id}>
                <a href={`/report?id=${report.id}`} className="dashboard-report-link">
                  <div>
                    <strong>{report.url}</strong>
                    <span>{formatDate(report.created_at)}{report.unlocked ? " · Full Report" : ""}</span>
                  </div>
                  <em>{report.score}</em>
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                {isPro && (
                  <button type="button" className="btn btn-secondary dashboard-retest-btn" onClick={() => router.push(`/report?id=${encodeURIComponent(report.id)}`)}>
                    Retest
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <div style={{ fontSize: "32px", marginBottom: "16px" }}>🔍</div>
            <div style={{ fontSize: "18px", fontWeight: 600, color: "#fff", marginBottom: "8px" }}>
              No scans yet
            </div>
            <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", marginBottom: "24px" }}>
              Scan any URL to get your AI visibility score in 60 seconds.
            </div>
            <a
              href="/scan"
              style={{
                background: "#00e5a0",
                color: "#000",
                fontWeight: 700,
                fontSize: "14px",
                padding: "12px 24px",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              Scan your first URL &rarr;
            </a>
          </div>
        )}
      </>
    );
  }

  function AuditsTab() {
    if (!account) return null;
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Site audits</h1>
          <a href="/audit" className="btn btn-secondary">New audit</a>
        </div>
        {account.recentAudits.length ? (
          <div className="dashboard-report-list">
            {account.recentAudits.map(audit => (
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
            <p>Run a multi-page site audit to get started.</p>
          </div>
        )}
      </>
    );
  }

  function SettingsTab() {
    if (!account) return null;
    const portalUrl = account.profile.portalUrl;
    return (
      <>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Account settings</h1>
        </div>

        <div style={{ ...card, maxWidth: 560, marginBottom: 16 }}>
          <h2 style={sectionHeading}>Plan</h2>
          <div style={settingsRow}>
            <span style={settingsLabel}>Current plan</span>
            <strong>{planLabel(account.profile.plan)}</strong>
          </div>
          <div style={{ ...settingsRow, borderBottom: "none" }}>
            <span style={settingsLabel}>Scan limit</span>
            <strong>{account.usage.unlimited ? "Unlimited" : `${account.usage.limit} / month`}</strong>
          </div>
          {hasUnlockedOneTimeReports && <p style={{ ...cardDesc, marginTop: 8 }}>Some reports are individually unlocked.</p>}
          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            {portalUrl && <a href={portalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">Manage subscription →</a>}
            {shouldShowUpgradeCard && <>
              <UpgradeButton plan="pro" className="btn btn-primary">Upgrade to Pro</UpgradeButton>
              <UpgradeButton plan="agency" className="btn btn-secondary">Get Agency</UpgradeButton>
            </>}
            <a href="/#pricing" className="btn btn-secondary">View pricing →</a>
          </div>
        </div>

        <div style={{ ...card, maxWidth: 560 }}>
          <h2 style={sectionHeading}>Account</h2>
          <div style={settingsRow}>
            <span style={settingsLabel}>Email</span>
            <strong style={{ fontSize: 13 }}>{account.profile.email}</strong>
          </div>
          <div style={{ ...settingsRow, borderBottom: "none" }}>
            <span style={settingsLabel}>Account ID</span>
            <strong style={{ fontFamily: "monospace", fontSize: 13 }}>{account.profile.id.slice(0, 16)}…</strong>
          </div>
        </div>
      </>
    );
  }

  function AdminTab() {
    return (
      <>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Admin</h1>
        </div>
        <div style={{ ...card, maxWidth: 400 }}>
          <p style={cardDesc}>Access private app controls, user management, and activity logs.</p>
          <a href="/admin" className="btn btn-secondary" style={{ marginTop: 8 }}>Open admin panel →</a>
        </div>
      </>
    );
  }

  // ── Bottom nav (mobile only) ─────────────────────────────

  function BottomNav() {
    if (!mounted || !isMobile) return null;

    const navStyle: React.CSSProperties = {
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      width: "100%",
      height: 64,
      background: "#0a0f0d",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-around",
      zIndex: 9999,
      padding: "0 8px",
    };

    const nav = (
      <nav className="db-bottom-nav" style={navStyle}>
        {([
          { id: "overview" as Tab, emoji: "🏠", label: "Home" },
          { id: "scans"    as Tab, emoji: "🔍", label: "Scans" },
          { id: "audits"   as Tab, emoji: "📋", label: "Audits" },
        ] as const).map(item => (
          <button
            key={item.id}
            type="button"
            className={`db-bottom-nav-item${activeTab === item.id ? " is-active" : ""}`}
            onClick={() => handleTabChange(item.id)}
          >
            <span className="db-bottom-nav-emoji">{item.emoji}</span>
            <span className="db-bottom-nav-label">{item.label}</span>
          </button>
        ))}
        <button type="button" className="db-bottom-nav-item" onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); router.push("/monitor"); }}>
          <span className="db-bottom-nav-emoji">📡</span>
          <span className="db-bottom-nav-label">Monitor</span>
        </button>
        <button type="button" className="db-bottom-nav-item" onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); router.push("/compare"); }}>
          <span className="db-bottom-nav-emoji">⚖️</span>
          <span className="db-bottom-nav-label">Compare</span>
        </button>
      </nav>
    );

    return createPortal(nav, document.body);
  }

  function renderContent() {
    if (activeTab === "overview") return <OverviewTab />;
    if (activeTab === "scans")    return <ScansTab />;
    if (activeTab === "audits")   return <AuditsTab />;
    if (activeTab === "settings") return <SettingsTab />;
    if (activeTab === "admin")    return <AdminTab />;
    return null;
  }

  return (
    <main className="min-h-screen" style={{ display: "flex", flexDirection: "column" }}>
      <SiteHeader />

      {loading ? (
        <div className="page-loading">
          <div className="page-loading-spinner" />
          <span>Loading your workspace…</span>
        </div>
      ) : error ? (
        <div className="page-loading">
          <strong style={{ color: "white" }}>Dashboard unavailable</strong>
          <p style={{ margin: 0 }}>{error}</p>
          <a href="/login?next=/dashboard" className="btn btn-secondary">Log in again</a>
        </div>
      ) : account && (
        <div className="app-container db-layout">
          <aside className="db-sidebar">
            <Sidebar />
          </aside>
          <div className="db-content">
            {renderContent()}
          </div>
        </div>
      )}

      <BottomNav />
      <SiteFooter />
    </main>
  );
}
