import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { isMasterAdmin } from "@/lib/admin";
import { getPlanLimit } from "@/lib/usage-limits";
import { hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";

import { getSupabaseServerUrl, getSupabaseServiceHeaders } from "@/lib/supabase-config";

const supabaseUrl = getSupabaseServerUrl();

type ProfileRow = {
  id: string;
  email: string | null;
  plan: "free" | "pro" | "agency";
  created_at: string;
};

function todayKey() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

async function getProfiles(limit: number, offset: number) {
  const params = new URLSearchParams({
    select: "id,email,plan,created_at",
    order: "created_at.desc",
    limit: String(limit),
    offset: String(offset),
  });
  const res = await fetch(`${supabaseUrl}/rest/v1/profiles?${params.toString()}`, {
    headers: getSupabaseServiceHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return [] as ProfileRow[];
  return (await res.json()) as ProfileRow[];
}

async function getReports(userIds: string[]) {
  if (!userIds.length) return [] as Array<{ user_id: string | null; created_at: string }>;
  const params = new URLSearchParams({
    select: "user_id,created_at",
    user_id: `in.(${userIds.join(",")})`,
    limit: "5000",
  });
  const res = await fetch(`${supabaseUrl}/rest/v1/reports?${params.toString()}`, {
    headers: getSupabaseServiceHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return [] as Array<{ user_id: string | null; created_at: string }>;
  return (await res.json()) as Array<{ user_id: string | null; created_at: string }>;
}

async function getUsageToday() {
  const params = new URLSearchParams({
    client_key: "like.user:%",
    usage_date: `eq.${todayKey()}`,
    select: "client_key,scan_count",
    limit: "5000",
  });
  const res = await fetch(`${supabaseUrl}/rest/v1/scan_usage?${params.toString()}`, {
    headers: getSupabaseServiceHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return [] as Array<{ client_key: string; scan_count: number }>;
  return (await res.json()) as Array<{ client_key: string; scan_count: number }>;
}

async function getAuthUsersMap(userIds: string[]) {
  if (!userIds.length) return new Map<string, string | null>();
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: getSupabaseServiceHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return new Map<string, string | null>();
  const data = (await res.json()) as { users?: Array<{ id: string; last_sign_in_at?: string | null }> };
  const idSet = new Set(userIds);
  return new Map(
    (data.users ?? [])
      .filter((u) => idSet.has(u.id))
      .map((u) => [u.id, u.last_sign_in_at ?? null])
  );
}

export async function GET(req: Request) {
  const auth = await getAuthContext(req);
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isMasterAdmin(auth.user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!hasSupabaseConfig()) return NextResponse.json({ users: [] });

  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || "100"), 200);
  const offset = Math.max(0, Number(url.searchParams.get("offset") || "0"));

  const profiles = await getProfiles(limit, offset);
  const userIds = profiles.map((p) => p.id).filter(Boolean);

  const [reports, usage, authUsers] = await Promise.all([
    getReports(userIds),
    getUsageToday(),
    getAuthUsersMap(userIds),
  ]);

  const reportTotals = new Map<string, { total: number; lastScan: string | null }>();
  for (const row of reports) {
    if (!row.user_id) continue;
    const current = reportTotals.get(row.user_id) ?? { total: 0, lastScan: null };
    current.total += 1;
    if (!current.lastScan || new Date(row.created_at) > new Date(current.lastScan)) {
      current.lastScan = row.created_at;
    }
    reportTotals.set(row.user_id, current);
  }

  const usageTotals = new Map<string, number>();
  for (const row of usage) {
    const userId = row.client_key.replace("user:", "");
    usageTotals.set(userId, row.scan_count ?? 0);
  }

  const users = profiles.map((profile) => {
    const todayUsed = usageTotals.get(profile.id) ?? 0;
    const limit = getPlanLimit(profile.plan);
    const unlimited = profile.plan === "pro" || profile.plan === "agency" || isMasterAdmin(profile.email);
    const reportMeta = reportTotals.get(profile.id) ?? { total: 0, lastScan: null };
    return {
      id: profile.id,
      email: profile.email ?? "unknown",
      role: isMasterAdmin(profile.email) ? "master_admin" : "user",
      plan: profile.plan,
      freeScansUsed: todayUsed,
      freeScansLeft: unlimited ? null : Math.max(0, limit - todayUsed),
      totalReports: reportMeta.total,
      createdAt: profile.created_at,
      lastSignInAt: authUsers.get(profile.id) ?? null,
      lastScanAt: reportMeta.lastScan,
    };
  });

  return NextResponse.json({ users, pagination: { limit, offset, count: users.length } });
}

