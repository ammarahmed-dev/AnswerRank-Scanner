import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { isMasterAdmin } from "@/lib/admin";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";

const supabaseUrl = getSupabaseServerUrl();

type RecentReport = {
  id: string;
  url: string;
  score: number;
  created_at: string;
  user_id: string | null;
};

function todayKey() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

async function getCount(table: string, query = "") {
  if (!hasSupabaseConfig()) return 0;
  const url = `${supabaseUrl}/rest/v1/${table}?select=id${query}`;
  const res = await fetch(url, {
    headers: { ...getSupabaseServiceHeaders(), Prefer: "count=exact" },
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
    headers: getSupabaseServiceHeaders(),
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
    headers: getSupabaseServiceHeaders(),
    cache: "no-store",
  });

  if (!res.ok) return 0;
  const rows = (await res.json()) as Array<{ scan_count?: number }>;
  return rows.reduce((total, row) => total + (row.scan_count ?? 0), 0);
}

export async function GET(req: Request) {
  try {
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
  } catch (err) {
    console.error("[api/admin/summary] unhandled error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

