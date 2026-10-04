import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { isMasterAdmin } from "@/lib/admin";
import { getPlanLimit, getUsageCount } from "@/lib/usage-limits";
import { normalizeUserPlan } from "@/lib/access";
import { toAccountReport, type AccountReport, type AccountReportRow } from "@/lib/account-reports";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";

const supabaseUrl = getSupabaseServerUrl();

type RecentAudit = {
  id: string;
  domain: string;
  aggregate_score: number | null;
  status: string;
  created_at: string;
};

type ProfileExtras = {
  portalUrl: string | null;
  onetimeUrl: string | null;
  onetimeScanCount: number;
};

async function getProfileExtras(userId: string): Promise<ProfileExtras> {
  if (!hasSupabaseConfig()) return { portalUrl: null, onetimeUrl: null, onetimeScanCount: 0 };
  const params = new URLSearchParams({
    id: `eq.${userId}`,
    select: "lemonsqueezy_portal_url,onetime_url,onetime_scan_count",
    limit: "1",
  });
  const res = await fetch(`${supabaseUrl}/rest/v1/profiles?${params.toString()}`, {
    headers: getSupabaseServiceHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return { portalUrl: null, onetimeUrl: null, onetimeScanCount: 0 };
  const rows = (await res.json()) as Array<{
    lemonsqueezy_portal_url?: string | null;
    onetime_url?: string | null;
    onetime_scan_count?: number | null;
  }>;
  const row = rows[0];
  return {
    portalUrl: row?.lemonsqueezy_portal_url ?? null,
    onetimeUrl: row?.onetime_url ?? null,
    onetimeScanCount: row?.onetime_scan_count ?? 0,
  };
}

async function getRecentReports(userId: string): Promise<AccountReport[]> {
  if (!hasSupabaseConfig()) return [];

  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
    select: "id,url,score,created_at,result,retest_count,max_retests",
    order: "created_at.desc",
    limit: "6",
  });

  const res = await fetch(`${supabaseUrl}/rest/v1/reports?${params.toString()}`, {
    headers: getSupabaseServiceHeaders(),
    cache: "no-store",
  });

  if (!res.ok) return [];

  const rows = (await res.json()) as AccountReportRow[];
  return rows.map(toAccountReport);
}

async function getRecentAudits(userId: string): Promise<RecentAudit[]> {
  if (!hasSupabaseConfig()) return [];
  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
    select: "id,domain,aggregate_score,status,created_at",
    order: "created_at.desc",
    limit: "5",
  });
  const res = await fetch(`${supabaseUrl}/rest/v1/audit_runs?${params.toString()}`, {
    headers: getSupabaseServiceHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as RecentAudit[];
}

async function getMonitorCount(userId: string): Promise<number> {
  if (!hasSupabaseConfig()) return 0;
  const params = new URLSearchParams({ user_id: `eq.${userId}`, select: "id" });
  const res = await fetch(`${supabaseUrl}/rest/v1/monitored_urls?${params.toString()}`, {
    headers: { ...getSupabaseServiceHeaders(), Prefer: "count=exact" },
    cache: "no-store",
  });
  if (!res.ok) return 0;
  const contentRange = res.headers.get("content-range") ?? "";
  return parseInt(contentRange.split("/")[1] ?? "0", 10);
}

async function getAuditCountThisMonth(userId: string): Promise<number> {
  if (!hasSupabaseConfig()) return 0;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
    created_at: `gte.${startOfMonth.toISOString()}`,
    select: "id",
  });
  const res = await fetch(`${supabaseUrl}/rest/v1/audit_runs?${params.toString()}`, {
    headers: getSupabaseServiceHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return 0;
  const rows = await res.json();
  return Array.isArray(rows) ? rows.length : 0;
}

export async function GET(req: Request) {
  const auth = await getAuthContext(req);

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [scanCount, reports, profileExtras, recentAudits, monitorCount, auditCountThisMonth, compareCountThisMonth] = await Promise.all([
    getUsageCount(`user:${auth.user.id}`),
    getRecentReports(auth.user.id),
    getProfileExtras(auth.user.id),
    getRecentAudits(auth.user.id),
    getMonitorCount(auth.user.id),
    getAuditCountThisMonth(auth.user.id),
    getUsageCount(`compare:user:${auth.user.id}`),
  ]);
  const { portalUrl, onetimeUrl, onetimeScanCount } = profileExtras;
  const isEmailAdmin = isMasterAdmin(auth.user.email);
  const profilePlan = normalizeUserPlan(auth.plan);
  // Admins (MASTER_ADMIN_EMAILS) get agency-level access. Agency customers are not admins.
  const plan = isEmailAdmin ? "agency" : profilePlan;
  const isAdmin = isEmailAdmin;
  const limit = getPlanLimit(plan);
  const unlimited = plan === "onetime" || plan === "pro" || plan === "agency";

  return NextResponse.json({
    profile: {
      id: auth.user.id,
      email: auth.user.email ?? "",
      plan,
      isAdmin,
      portalUrl,
      onetimeUrl,
      onetimeScanCount,
    },
    usage: {
      count: scanCount,
      limit,
      remaining: unlimited ? null : Math.max(0, limit - scanCount),
      unlimited,
    },
    reports,
    recentAudits,
    monitorCount,
    auditCountThisMonth,
    compareCountThisMonth,
  });
}

