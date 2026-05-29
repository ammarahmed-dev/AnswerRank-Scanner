import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { isMasterAdmin } from "@/lib/admin";
import { getPlanLimit, getUsageCount } from "@/lib/usage-limits";
import { normalizeUserPlan } from "@/lib/access";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";

const supabaseUrl = getSupabaseServerUrl();

type RecentReport = {
  id: string;
  url: string;
  score: number;
  created_at: string;
  retest_count?: number;
  max_retests?: number;
  unlocked?: boolean;
  result?: {
    unlocked?: boolean;
    unlockedAt?: string;
  };
};

async function getRecentReports(userId: string) {
  if (!hasSupabaseConfig()) return [] as RecentReport[];

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

  if (!res.ok) return [] as RecentReport[];

  const rows = (await res.json()) as RecentReport[];
  return rows.map((row) => ({
    ...row,
    unlocked: Boolean(row.result?.unlocked || row.result?.unlockedAt),
    retest_count: typeof row.retest_count === "number" ? row.retest_count : 0,
    max_retests: typeof row.max_retests === "number" ? row.max_retests : 3,
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
  const isEmailAdmin = isMasterAdmin(auth.user.email);
  const profilePlan = normalizeUserPlan(auth.plan);
  // Email check is primary; agency plan in Supabase is the fallback
  // (covers cases where MASTER_ADMIN_EMAILS is missing but profile was already set to "agency")
  const plan = isEmailAdmin ? "agency" : profilePlan;
  const isAdmin = isEmailAdmin || plan === "agency";
  const limit = getPlanLimit(plan);
  const unlimited = plan === "onetime" || plan === "pro" || plan === "agency";

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

