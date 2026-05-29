import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { isMasterAdmin as isMasterAdminEmail } from "@/lib/admin";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";

const supabaseUrl = getSupabaseServerUrl();
const DEFAULT_MAX_RETESTS = 3;

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: reportId } = await context.params;
  if (!reportId) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const admin = isMasterAdminEmail(auth.user.email);

  const params = new URLSearchParams({
    id: `eq.${reportId}`,
    select: "id,user_id,url,retest_count,max_retests,result",
    limit: "1",
  });
  if (!admin) {
    params.set("user_id", `eq.${auth.user.id}`);
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/reports?${params.toString()}`, {
    headers: getSupabaseServiceHeaders(),
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
  const proMonthly = auth.plan === "pro" || auth.plan === "agency";
  const retestCount = report.retest_count ?? 0;
  const maxRetests = report.max_retests ?? DEFAULT_MAX_RETESTS;
  const isUnlocked = Boolean(report.result?.unlocked || report.result?.unlockedAt);

  if (!admin && !proMonthly) {
    if (!isUnlocked) {
      return NextResponse.json({ error: "Upgrade to Full Report to use retest" }, { status: 403 });
    }
    if (retestCount >= maxRetests) {
      return NextResponse.json(
        {
          error: "Retest limit reached",
          message: `You have used all ${DEFAULT_MAX_RETESTS} retests for this report. Upgrade to Pro Monthly for unlimited retests.`,
          retestCount,
          maxRetests,
        },
        { status: 403 }
      );
    }
  }

  const nextRetestCount = admin || proMonthly ? retestCount : retestCount + 1;

  if (!admin && !proMonthly) {
    const patchRes = await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${encodeURIComponent(reportId)}`, {
      method: "PATCH",
      headers: {
        ...getSupabaseServiceHeaders(),
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        retest_count: nextRetestCount,
        updated_at: new Date().toISOString(),
      }),
    });
    if (!patchRes.ok) {
      const details = await patchRes.text().catch(() => "");
      console.error("Retest count update failed:", details);
      return NextResponse.json({ error: "Could not record retest. Please try again." }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    url: report.url,
    retestCount: nextRetestCount,
    maxRetests: proMonthly || admin ? 999 : maxRetests,
    remainingRetests: proMonthly || admin ? 999 : Math.max(0, maxRetests - nextRetestCount),
  });
}
