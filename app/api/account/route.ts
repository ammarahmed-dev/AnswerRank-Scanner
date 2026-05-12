import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { isMasterAdmin } from "@/lib/admin";
import { getPlanLimit, getUsageCount } from "@/lib/usage-limits";
import { normalizeUserPlan } from "@/lib/access";

export const runtime = "nodejs";

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type RecentReport = {
  id: string;
  url: string;
  score: number;
  created_at: string;
  unlocked?: boolean;
  result?: {
    unlocked?: boolean;
    unlockedAt?: string;
  };
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

async function getRecentReports(userId: string) {
  if (!hasSupabaseConfig()) return [] as RecentReport[];

  const params = new URLSearchParams({
    user_id: `eq.${userId}`,
    select: "id,url,score,created_at,result",
    order: "created_at.desc",
    limit: "6",
  });

  const res = await fetch(`${supabaseUrl}/rest/v1/reports?${params.toString()}`, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });

  if (!res.ok) return [] as RecentReport[];

  const rows = (await res.json()) as RecentReport[];
  return rows.map((row) => ({
    ...row,
    unlocked: Boolean(row.result?.unlocked || row.result?.unlockedAt),
  }));
}

export async function GET(req: Request) {
  const auth = await getAuthContext(req);

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [scanCount, reports] = await Promise.all([
    getUsageCount(`user:${auth.user.id}`),
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

