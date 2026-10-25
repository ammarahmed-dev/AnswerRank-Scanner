import type React from "react";

export type Tab = "overview" | "scans" | "audits" | "settings" | "admin";

export type RecentAudit = {
  id: string;
  domain: string;
  aggregate_score: number | null;
  status: string;
  created_at: string;
};

export type AccountData = {
  profile: {
    id: string;
    email: string;
    plan: "guest" | "free" | "onetime" | "pro" | "agency";
    isAdmin?: boolean;
    portalUrl?: string | null;
    onetimeUrl?: string | null;
    onetimeScanCount?: number;
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
    /** Score of the earlier scan of the same URL, when this report was a rescan. */
    previousScore?: number | null;
  }>;
  recentAudits: RecentAudit[];
  monitorCount: number;
  auditCountThisMonth: number;
  compareCountThisMonth: number;
};

export function planLabel(plan: AccountData["profile"]["plan"]) {
  if (plan === "agency") return "Agency";
  if (plan === "pro") return "Pro";
  if (plan === "onetime") return "Full Report";
  return "Free";
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

// ── Shared inline style helpers ──────────────────────────────────

export const card: React.CSSProperties = {
  background: "#0d1117",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 12,
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

export const grid3: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 16,
};

export const cardLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "rgba(255,255,255,0.4)",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  margin: 0,
};

export const cardValue: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 700,
  color: "#fff",
  lineHeight: 1.1,
  margin: 0,
};

export const cardDesc: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(255,255,255,0.45)",
  margin: 0,
  lineHeight: 1.5,
};

export const cardLink: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(0,229,160,0.85)",
  textDecoration: "none",
};

export const sectionHeading: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: "#fff",
  margin: "0 0 16px",
};

export const settingsRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 14,
  padding: "10px 0",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

export const settingsLabel: React.CSSProperties = {
  color: "rgba(255,255,255,0.5)",
};
