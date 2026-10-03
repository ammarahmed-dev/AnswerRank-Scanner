import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { isMasterAdmin as isAdminEmail } from "@/lib/admin";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";
import { getAuditTier } from "@/lib/audit-access";
import { discoverPages } from "@/lib/page-discovery";
import { assertPublicUrl } from "@/lib/url-safety";

export const runtime = "nodejs";

const supabaseUrl = getSupabaseServerUrl();

export async function POST(req: Request) {
  try {
    const auth = await getAuthContext(req);
    if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasSupabaseConfig()) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

    const isAdmin = isAdminEmail(auth.user.email);
    const effectivePlan = isAdmin ? "agency" : auth.plan;
    const tier = getAuditTier(isAdmin ? "agency" : auth);

    // Onetime plan: 1 audit per calendar month
    if (!isAdmin && effectivePlan === "onetime") {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const monthlyRes = await fetch(
        `${supabaseUrl}/rest/v1/audit_runs?user_id=eq.${auth.user.id}&created_at=gte.${startOfMonth.toISOString()}&select=id`,
        { headers: { ...getSupabaseServiceHeaders(), Prefer: "count=exact" }, cache: "no-store" }
      );
      const range = monthlyRes.headers.get("content-range") ?? "";
      const monthlyCount = parseInt(range.split("/")[1] ?? "0", 10);
      if (monthlyCount >= 1) {
        return NextResponse.json(
          { error: "You've used your included audit. Upgrade to Pro for unlimited audits." },
          { status: 429 }
        );
      }
    }

    let body: { domain?: unknown };
    try {
      body = (await req.json()) as { domain?: unknown };
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const rawDomain = typeof body.domain === "string" ? body.domain.trim() : "";
    if (!rawDomain) return NextResponse.json({ error: "domain is required." }, { status: 400 });

    let baseUrl: string;
    try {
      const u = new URL(rawDomain.startsWith("http") ? rawDomain : `https://${rawDomain}`);
      baseUrl = u.origin;
    } catch {
      return NextResponse.json({ error: "Invalid domain." }, { status: 400 });
    }

    const domain = new URL(baseUrl).hostname;

    // Check audit limit for user
    if (!isAdmin && tier.auditLimit < 999) {
      let windowStart: string;
      if (effectivePlan === "free") {
        const startOfMonth = new Date();
        startOfMonth.setUTCDate(1);
        startOfMonth.setUTCHours(0, 0, 0, 0);
        windowStart = startOfMonth.toISOString();
      } else {
        windowStart = new Date(Date.now() - tier.windowHours * 60 * 60 * 1000).toISOString();
      }
      const countRes = await fetch(
        `${supabaseUrl}/rest/v1/audit_runs?user_id=eq.${auth.user.id}&created_at=gte.${windowStart}&select=id`,
        { headers: { ...getSupabaseServiceHeaders(), Prefer: "count=exact" }, cache: "no-store" }
      );
      const contentRange = countRes.headers.get("content-range") ?? "";
      const recentCount = parseInt(contentRange.split("/")[1] ?? "0", 10);
      if (recentCount >= tier.auditLimit) {
        return NextResponse.json(
          { error: effectivePlan === "free"
              ? "You've used your included audit for this month. It resets on the 1st of next month."
              : `Audit limit reached (${tier.auditLimit} audits per ${tier.windowHours} hours).` },
          { status: 429 }
        );
      }
    }

    try {
      await assertPublicUrl(baseUrl);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }

    // Discover pages (runs async after we've responded would be ideal but we need the urls)
    // SQL needed if column missing: ALTER TABLE audit_runs ADD COLUMN IF NOT EXISTS total_discovered INTEGER DEFAULT 0;
    const { urls, totalDiscovered } = await discoverPages(baseUrl, tier.pageLimit);

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/audit_runs`, {
      method: "POST",
      headers: { ...getSupabaseServiceHeaders(), Prefer: "return=representation" },
      body: JSON.stringify({
        user_id: auth.user.id,
        domain,
        status: "pending",
        total_pages: urls.length,
        scanned_pages: 0,
        page_limit: tier.pageLimit,
        total_discovered: totalDiscovered,
        urls,
        results: [],
      }),
    });

    if (!insertRes.ok) {
      const detail = await insertRes.text().catch(() => "");
      console.error("[audit POST] insert failed:", detail);
      return NextResponse.json({ error: "Failed to create audit." }, { status: 500 });
    }

    const [row] = (await insertRes.json()) as Array<{ id: string }>;
    return NextResponse.json({ id: row.id, urls }, { status: 201 });
  } catch (err) {
    console.error("[audit POST] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
