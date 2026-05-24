import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { isMasterAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const REQUIRED_VARS = [
  "DEEPSEEK_API_KEY",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "OPENROUTER_API_KEY",
  "JINA_API_KEY",
  "GOOGLE_PAGESPEED_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "RESEND_API_KEY",
] as const;

export async function GET(req: Request) {
  const auth = await getAuthContext(req);

  if (!auth.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isMasterAdmin(auth.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const vars = Object.fromEntries(
    REQUIRED_VARS.map((key) => [key, process.env[key] ? "present" : "missing"])
  ) as Record<string, "present" | "missing">;

  const allPresent = Object.values(vars).every((v) => v === "present");

  return NextResponse.json(
    { ok: allPresent, vars },
    { status: allPresent ? 200 : 500 }
  );
}
