import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { isMasterAdmin } from "@/lib/admin";
import { getPlanLimit } from "@/lib/usage-limits";
import { normalizeUserPlan } from "@/lib/access";

export const runtime = "nodejs";

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type RecentReport = {
  id: string;
  url: string;
  score: number;
  created_at: string;
};

function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

function supabaseHeaders() {
  return {
    apikey: supabaseServiceRoleKey ?? "",
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
  };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function getTodayUsage(userId: string) {
  if (!hasSupabaseConfig()) return 0;

  const params = new URLSearchParams({
    client_key: `eq.user:${userId}`,
    usage_date: `eq.${todayKey()}`,
    select: "scan_count",
    limit: "1",
  });

  const res = await fetch(`${supabaseUrl}/rest/v1/scan_usage?${params.toString()}`, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });

  if (!res.ok) return 0;

  const rows = (await res.json()) as Array<{ scan_count?: number }>;
  return rows[0]?.scan_count ?? 0;
}

async function getRecentReports(userId: string) {
  if (!hasSupabaseConfig()) return [] as RecentReport[];

  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
    select: "id,url,score,created_at",
    order: "created_at.desc",
    limit: "6",
  });

  const res = await fetch(`${supabaseUrl}/rest/v1/reports?${params.toString()}`, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });

  if (!res.ok) return [] as RecentReport[];

  return (await res.json()) as RecentReport[];
}

export async function GET(req: Request) {
  const auth = await getAuthContext(req);

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [scanCount, reports] = await Promise.all([
    getTodayUsage(auth.user.id),
    getRecentReports(auth.user.id),
  ]);
  const isAdmin = isMasterAdmin(auth.user.email);
  const plan = isAdmin ? "agency" : normalizeUserPlan(auth.plan);
  const limit = getPlanLimit(plan);
  const unlimited = plan === "pro" || plan === "agency";

  return NextResponse.json({
    profile: {
      id: auth.user.id,
      email: auth.user.email ?? "",
      plan,
      isAdmin,
    },
    usage: {
      count: scanCount,
      limit,
      remaining: unlimited ? null : Math.max(0, limit - scanCount),
      unlimited,
    },
    reports,
  });
}
