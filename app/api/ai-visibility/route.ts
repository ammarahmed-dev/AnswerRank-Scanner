import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { isMasterAdmin } from "@/lib/admin";
import { availableEngines, normalizeDomain, runVisibilityCheck, suggestPrompts } from "@/lib/ai-visibility";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PROMPTS = 10;

// AI Visibility Tracker (docs/RESEARCH.md). Off unless AI_VISIBILITY_ENABLED=true, and limited to
// admins until the owner decides which plans include it (see docs/ROADMAP.md owner actions).
export async function POST(req: Request) {
  if (process.env.AI_VISIBILITY_ENABLED !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = await getAuthContext(req);
  if (!auth.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isMasterAdmin(auth.user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { brandName?: unknown; domain?: unknown; prompts?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const brandName = typeof body.brandName === "string" ? body.brandName.trim().slice(0, 80) : "";
  const domain = typeof body.domain === "string" ? normalizeDomain(body.domain) : "";
  if (!brandName || !domain || !domain.includes(".")) {
    return NextResponse.json({ error: "brandName and domain are required." }, { status: 400 });
  }

  const prompts = (Array.isArray(body.prompts) ? body.prompts : [])
    .filter((p): p is string => typeof p === "string")
    .map((p) => p.trim().slice(0, 200))
    .filter(Boolean)
    .slice(0, MAX_PROMPTS);
  const finalPrompts = prompts.length ? prompts : suggestPrompts({ brandName });

  const engines = availableEngines();
  if (!engines.length) {
    return NextResponse.json({ error: "No AI engines configured (PERPLEXITY_API_KEY or GEMINI_API_KEY)." }, { status: 503 });
  }

  const summary = await runVisibilityCheck({ name: brandName, domain }, finalPrompts, engines);
  return NextResponse.json({ brand: { name: brandName, domain }, prompts: finalPrompts, engines: engines.map((e) => e.name), ...summary });
}
