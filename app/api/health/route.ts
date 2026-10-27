import { authUnavailableResponse } from "@/lib/auth-response";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { getServiceCapabilities } from "@/lib/service-capabilities";
import { isMasterAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await getAuthContext(req);
  const authUnavailable = authUnavailableResponse(auth);
  if (authUnavailable) return authUnavailable;

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMasterAdmin(auth.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const readiness = getServiceCapabilities();
  return NextResponse.json(
    { ...readiness, assessment: "configuration", note: "Configuration readiness only. Provider connectivity and database migrations are not probed." },
    { status: readiness.ok ? 200 : 503 }
  );
}
