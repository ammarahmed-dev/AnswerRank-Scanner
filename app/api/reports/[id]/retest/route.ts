import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { isMasterAdmin as isMasterAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

type ReportRow = {
  id: string;
  user_id: string | null;
  url: string;
  retest_count?: number;
  max_retests?: number;
  result?: {
    unlocked?: boolean;
    unlockedAt?: string;
  };
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Retest is unavailable right now." }, { status: 503 });
  }

  const auth = await getAuthContext(req);
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { id: reportId } = await context.params;
  if (!reportId) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const params = new URLSearchParams({
    id: `eq.${reportId}`,
    user_id: `eq.${auth.user.id}`,
    select: "id,user_id,url,retest_count,max_retests,result",
    limit: "1",
  });

  const res = await fetch(`${supabaseUrl}/rest/v1/reports?${params.toString()}`, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const rows = (await res.json()) as ReportRow[];
  const report = rows[0];
  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const admin = isMasterAdminEmail(auth.user.email);
  const proMonthly = auth.plan === "pro" || auth.plan === "agency";
  const retestCount = report.retest_count ?? 0;
  const maxRetests = report.max_retests ?? 3;
  const isUnlocked = Boolean(report.result?.unlocked || report.result?.unlockedAt);

  if (!admin && !proMonthly) {
    if (!isUnlocked) {
      return NextResponse.json({ error: "Upgrade to Full Report to use retest" }, { status: 403 });
    }
    if (retestCount >= maxRetests) {
      return NextResponse.json(
        {
          error: "Retest limit reached",
          message: "You have used all 3 retests for this report. Upgrade to Pro Monthly for unlimited retests.",
          retestCount,
          maxRetests,
        },
        { status: 403 }
      );
    }
  }

  const nextRetestCount = admin || proMonthly ? retestCount : retestCount + 1;

  if (!admin && !proMonthly) {
    await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${encodeURIComponent(reportId)}`, {
      method: "PATCH",
      headers: {
        ...supabaseHeaders(),
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        retest_count: nextRetestCount,
        updated_at: new Date().toISOString(),
      }),
    }).catch(() => null);
  }

  return NextResponse.json({
    success: true,
    url: report.url,
    retestCount: nextRetestCount,
    maxRetests: proMonthly || admin ? 999 : maxRetests,
    remainingRetests: proMonthly || admin ? 999 : Math.max(0, maxRetests - nextRetestCount),
  });
}
