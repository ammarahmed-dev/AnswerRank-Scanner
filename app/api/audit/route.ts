import { authUnavailableResponse } from "@/lib/auth-response";
import { createAuditWithLimits, AuditCreationLimit } from "@/lib/audit-creation";
import { BodyTooLargeError, readJsonObject } from "@/lib/bounded-body";
import { CountUnavailableError, fetchExactCount } from "@/lib/exact-count";
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
    const authUnavailable = authUnavailableResponse(auth);
    if (authUnavailable) return authUnavailable;
    if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!hasSupabaseConfig()) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

    let body: { domain?: unknown };
    try {
      body = await readJsonObject(req);
    } catch (error) {
      return NextResponse.json({ error: error instanceof BodyTooLargeError ? "Request body is too large." : "Invalid request body." }, { status: error instanceof BodyTooLargeError ? 413 : 400 });
    }

    const isAdmin = isAdminEmail(auth.user.email);
    const effectivePlan = isAdmin ? "agency" : auth.plan;
    const tier = getAuditTier(isAdmin ? "agency" : auth);

    // Onetime plan: 1 audit per calendar month
    if (!isAdmin && effectivePlan === "onetime") {
      const startOfMonth = new Date();
      startOfMonth.setUTCDate(1);
      startOfMonth.setUTCHours(0, 0, 0, 0);
      const monthlyCount = await fetchExactCount(
        `${supabaseUrl}/rest/v1/audit_runs?user_id=eq.${auth.user.id}&created_at=gte.${startOfMonth.toISOString()}&select=id`,
        { headers: { ...getSupabaseServiceHeaders(), Prefer: "count=exact" }, cache: "no-store" }
      );
      if (monthlyCount >= 1) {
        return NextResponse.json(
          { error: "You've used your included audit. Upgrade to Pro for unlimited audits." },
          { status: 429 }
        );
      }
    }

    const rawDomain = typeof body.domain === "string" ? body.domain.trim() : "";
    if (!rawDomain || rawDomain.length > 4096) return NextResponse.json({ error: "domain is required." }, { status: 400 });

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
      const recentCount = await fetchExactCount(
        `${supabaseUrl}/rest/v1/audit_runs?user_id=eq.${auth.user.id}&created_at=gte.${windowStart}&select=id`,
        { headers: { ...getSupabaseServiceHeaders(), Prefer: "count=exact" }, cache: "no-store" }
      );
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

    const { urls, totalDiscovered } = await discoverPages(baseUrl, tier.pageLimit);
    try {
      const id = await createAuditWithLimits({
        userId: auth.user.id, domain, urls, totalDiscovered, pageLimit: tier.pageLimit,
        monthlyLimit: effectivePlan === "free" || effectivePlan === "onetime" ? 1 : null,
        rollingLimit: !isAdmin && effectivePlan !== "free" && tier.auditLimit < 999 ? tier.auditLimit : null,
        windowHours: tier.windowHours,
      });
      return NextResponse.json({ id, urls }, { status: 201 });
    } catch (error) {
      if (error instanceof AuditCreationLimit) {
        return NextResponse.json({ error: error.window === "monthly"
          ? effectivePlan === "onetime"
            ? "You've used your included audit. Upgrade to Pro for unlimited audits."
            : "You've used your included audit for this month. It resets on the 1st of next month."
          : `Audit limit reached (${tier.auditLimit} audits per ${tier.windowHours} hours).` }, { status: 429 });
      }
      return NextResponse.json({ error: "Could not create audit. Reload your audit history before retrying." }, { status: 503 });
    }
  } catch (err) {
    if (err instanceof CountUnavailableError) return NextResponse.json({ error: err.message }, { status: 503 });
    console.error("[audit POST] Unhandled error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
