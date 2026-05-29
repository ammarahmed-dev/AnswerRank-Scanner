import { NextResponse } from "next/server";
import { getReportRecord } from "@/lib/report-db";
import { getAuthContext } from "@/lib/auth-server";
import { isMasterAdmin } from "@/lib/admin";

export const runtime = "nodejs";

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
  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user_id: reportUserId, ...responseReport } = report as typeof report & { user_id?: string | null };
  const isAdmin = isMasterAdmin(auth.user.email);
  // guest scans (null user_id) are viewable by any authenticated user
  if (!isAdmin && reportUserId !== null && reportUserId !== auth.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(responseReport, { status: 200 });
}

