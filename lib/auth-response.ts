import { NextResponse } from "next/server";
import type { AuthContext } from "@/lib/auth-server";

/** Unknown identity/rights are a retryable service failure, never guest or Free access. */
export function authUnavailableResponse(auth: AuthContext) {
  return auth.unavailable
    ? NextResponse.json({ error: "Account verification is temporarily unavailable. Please try again shortly." }, { status: 503, headers: { "Cache-Control": "private, no-store" } })
    : null;
}
