"use client";

import "./dashboard.css";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  Activity,
  ArrowUpRight,
  ClipboardList,
  FileSearch,
  GitCompareArrows,
  LayoutDashboard,
  Search,
  Settings,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import UpgradeButton from "../components/UpgradeButton";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { isMasterAdmin } from "@/lib/access";
import OverviewTab from "./OverviewTab";
import {
  card,
  cardDesc,
  formatDate,
  planLabel,
  sectionHeading,
  settingsLabel,
  settingsRow,
  type AccountData,
  type Tab,
} from "./dashboard-shared";

const NAV_TABS: Array<{ id: Tab; icon: LucideIcon; label: string }> = [
  { id: "overview", icon: LayoutDashboard, label: "Overview" },
  { id: "scans",    icon: Search,            label: "Scans" },
  { id: "audits",   icon: ClipboardList,    label: "Audits" },
  { id: "settings", icon: Settings,          label: "Settings" },
];

// ── Component ────────────────────────────────────────────────────

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
    ...(masterAdmin ? [{ id: "admin" as Tab, icon: Shield, label: "Admin" }] : []),
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

  // ── Sidebar ────────────────────────────────────────────────────

  function renderSidebar() {
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
              <tab.icon size={16} aria-hidden="true" style={{ width: 20, flexShrink: 0 }} />
              {tab.label}
            </button>
          ))}

          <div className="db-nav-divider" style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "8px 8px" }} />

          <button type="button" className="db-tab" style={externalTabStyle()} onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); router.push("/monitor"); }}>
            <Activity size={16} aria-hidden="true" style={{ width: 20, flexShrink: 0 }} />
            Monitor
          </button>
          <button type="button" className="db-tab" style={externalTabStyle()} onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); router.push("/compare"); }}>
            <GitCompareArrows size={16} aria-hidden="true" style={{ width: 20, flexShrink: 0 }} />
            Compare
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

  // ── Tab content ────────────────────────────────────────────────

  function renderScansTab() {
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
                  <div style={{ minWidth: 0 }}>
                    <div className="dashboard-url-row">
                      <strong>{report.url}</strong>
                      {account.profile.plan === "onetime" && account.profile.onetimeUrl && account.profile.onetimeUrl === report.url && (
                        <span className="onetime-full-badge">Full Report</span>
                      )}
                    </div>
                    <span>
                      {formatDate(report.created_at)}{report.unlocked && !(account.profile.plan === "onetime" && account.profile.onetimeUrl === report.url) ? " · Full Report" : ""}
                      {typeof report.previousScore === "number" && report.score !== report.previousScore && (
                        <b
                          className={`dashboard-delta ${report.score > report.previousScore ? "dashboard-delta-up" : "dashboard-delta-down"}`}
                          title={`Previous scan of this URL: ${report.previousScore}`}
                        >
                          {report.score > report.previousScore ? "▲ +" : "▼ "}{report.score - report.previousScore}
                        </b>
                      )}
                    </span>
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

  function renderAuditsTab() {
    if (!account) return null;
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>Site audits</h1>
          <Link href="/audit" className="btn btn-secondary">New audit</Link>
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

  function renderSettingsTab() {
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
            <a href="/pricing" className="btn btn-secondary">View pricing →</a>
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

  function renderAdminTab() {
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

  // ── Bottom nav (mobile only) ──────────────────────────────────

  function renderBottomNav() {
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
          { id: "overview" as Tab, icon: LayoutDashboard, label: "Home" },
          { id: "scans"    as Tab, icon: Search,            label: "Scans" },
          { id: "audits"   as Tab, icon: ClipboardList,    label: "Audits" },
        ] as const).map(item => (
          <button
            key={item.id}
            type="button"
            className={`db-bottom-nav-item${activeTab === item.id ? " is-active" : ""}`}
            onClick={() => handleTabChange(item.id)}
          >
            <span className="db-bottom-nav-emoji">
              <item.icon size={20} aria-hidden="true" />
            </span>
            <span className="db-bottom-nav-label">{item.label}</span>
          </button>
        ))}
        <button type="button" className="db-bottom-nav-item" onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); router.push("/monitor"); }}>
          <span className="db-bottom-nav-emoji">
            <Activity size={20} aria-hidden="true" />
          </span>
          <span className="db-bottom-nav-label">Monitor</span>
        </button>
        <button type="button" className="db-bottom-nav-item" onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); router.push("/compare"); }}>
          <span className="db-bottom-nav-emoji">
            <GitCompareArrows size={20} aria-hidden="true" />
          </span>
          <span className="db-bottom-nav-label">Compare</span>
        </button>
      </nav>
    );

    return createPortal(nav, document.body);
  }

  function renderContent() {
    if (activeTab === "overview") {
      if (!account) return null;
      return (
        <OverviewTab
          account={account}
          isMobile={isMobile}
          masterAdmin={masterAdmin}
          shouldShowUpgradeCard={shouldShowUpgradeCard}
          usagePercent={usagePercent}
        />
      );
    }
    if (activeTab === "scans")    return renderScansTab();
    if (activeTab === "audits")   return renderAuditsTab();
    if (activeTab === "settings") return renderSettingsTab();
    if (activeTab === "admin")    return renderAdminTab();
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
            {renderSidebar()}
          </aside>
          <div className="db-content">
            {renderContent()}
          </div>
        </div>
      )}

      {renderBottomNav()}
      <SiteFooter />
    </main>
  );
}
