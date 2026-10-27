import { authUnavailableResponse } from "@/lib/auth-response";
import { BodyTooLargeError, readJsonObject } from "@/lib/bounded-body";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

export const runtime = "nodejs";

const supabaseUrl = getSupabaseServerUrl();

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteContext) {
  const auth = await getAuthContext(req);
  const authUnavailable = authUnavailableResponse(auth);
  if (authUnavailable) return authUnavailable;
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasSupabaseConfig()) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { id } = await params;

  let body: { frequency?: unknown };
  try {
    body = await readJsonObject(req);
  } catch (error) {
    return NextResponse.json({ error: error instanceof BodyTooLargeError ? "Request body is too large." : "Invalid request body." }, { status: error instanceof BodyTooLargeError ? 413 : 400 });
  }

  if (body.frequency !== "weekly" && body.frequency !== "monthly") {
    return NextResponse.json({ error: "frequency must be 'weekly' or 'monthly'." }, { status: 400 });
  }

  const qs = new URLSearchParams({ id: `eq.${id}`, user_id: `eq.${auth.user.id}` });
  const res = await fetch(`${supabaseUrl}/rest/v1/monitored_urls?${qs.toString()}`, {
    method: "PATCH",
    headers: { ...getSupabaseServiceHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify({ frequency: body.frequency }),
  });

  if (!res.ok) return NextResponse.json({ error: "Update failed." }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const auth = await getAuthContext(req);
  const authUnavailable = authUnavailableResponse(auth);
  if (authUnavailable) return authUnavailable;
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasSupabaseConfig()) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });

  const { id } = await params;
  const qs = new URLSearchParams({ id: `eq.${id}`, user_id: `eq.${auth.user.id}` });
  const res = await fetch(`${supabaseUrl}/rest/v1/monitored_urls?${qs.toString()}`, {
    method: "DELETE",
    headers: { ...getSupabaseServiceHeaders(), Prefer: "return=minimal" },
  });

  if (!res.ok) return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
