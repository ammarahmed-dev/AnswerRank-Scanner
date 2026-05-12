import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { isMasterAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type RecentReport = {
  id: string;
  url: string;
  score: number;
  created_at: string;
  user_id: string | null;
};

function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

function supabaseHeaders(extra?: HeadersInit) {
  return {
    apikey: supabaseServiceRoleKey ?? "",
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function getCount(table: string, query = "") {
  if (!hasSupabaseConfig()) return 0;
  const url = `${supabaseUrl}/rest/v1/${table}?select=id${query}`;
  const res = await fetch(url, {
    headers: supabaseHeaders({ Prefer: "count=exact" }),
    cache: "no-store",
  });

  if (!res.ok) return 0;
  const range = res.headers.get("content-range") ?? "";
  return Number(range.split("/")[1] ?? 0) || 0;
}

async function getRecentReports() {
  if (!hasSupabaseConfig()) return [] as RecentReport[];

  const params = new URLSearchParams({
    select: "id,url,score,created_at,user_id",
    order: "created_at.desc",
    limit: "8",
  });

  const res = await fetch(`${supabaseUrl}/rest/v1/reports?${params.toString()}`, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });

  if (!res.ok) return [] as RecentReport[];
  return (await res.json()) as RecentReport[];
}

async function getTodayScans() {
  if (!hasSupabaseConfig()) return 0;

  const params = new URLSearchParams({
    usage_date: `eq.${todayKey()}`,
    select: "scan_count",
  });

  const res = await fetch(`${supabaseUrl}/rest/v1/scan_usage?${params.toString()}`, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });

  if (!res.ok) return 0;
  const rows = (await res.json()) as Array<{ scan_count?: number }>;
  return rows.reduce((total, row) => total + (row.scan_count ?? 0), 0);
}

export async function GET(req: Request) {
  const auth = await getAuthContext(req);

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMasterAdmin(auth.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [users, proUsers, reports, todayScans, recentReports] = await Promise.all([
    getCount("profiles"),
    getCount("profiles", "&plan=in.(pro,agency)"),
    getCount("reports"),
    getTodayScans(),
    getRecentReports(),
  ]);

  return NextResponse.json({
    stats: {
      users,
      proUsers,
      reports,
      todayScans,
    },
    recentReports,
  });
}

