import { NextResponse } from "next/server";
import { getReportRecord } from "@/lib/report-db";
import { getAuthContext } from "@/lib/auth-server";
import { isMasterAdmin } from "@/lib/admin";
import { reportForViewer } from "@/lib/report-access";

export const runtime = "nodejs";

// Report IDs are random UUIDs and act as share links: anyone with the link can view the report.
// Only the owner (or a Pro/Agency/admin viewer) gets the paid sections; everyone else gets the
// free preview, so sharing an unlocked report never gives the paid content away.
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const report = await getReportRecord(id);

  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const auth = await getAuthContext(req);
  const { user_id: reportUserId, ...responseReport } = report as typeof report & { user_id?: string | null };
  const isAdmin = auth.user ? isMasterAdmin(auth.user.email) : false;
  const isOwner = Boolean(auth.user && reportUserId && reportUserId === auth.user.id);

  return NextResponse.json(
    reportForViewer(responseReport, { plan: auth.plan, isAdmin, isOwner }),
    { status: 200, headers: { "Cache-Control": "private, no-store" } }
  );
}
