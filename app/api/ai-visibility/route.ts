import { BodyTooLargeError, readJsonObject } from "@/lib/bounded-body";
import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth-server";
import { isMasterAdmin } from "@/lib/admin";
import { availableEngines, normalizeDomain, runVisibilityCheck, suggestPrompts } from "@/lib/ai-visibility";
import { listVisibilityRuns, saveVisibilityRun } from "@/lib/ai-visibility-store";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PROMPTS = 10;

// AI Visibility Tracker (docs/RESEARCH.md). Off unless AI_VISIBILITY_ENABLED=true, and limited to
// admins until the owner decides which plans include it (see docs/ROADMAP.md owner actions).
async function authorizeAdmin(req: Request) {
  if (process.env.AI_VISIBILITY_ENABLED !== "true") {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  const auth = await getAuthContext(req);
  if (!auth.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!isMasterAdmin(auth.user.email)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user: auth.user };
}

/** Run history, newest first. Optional `?domain=` narrows to one brand. */
export async function GET(req: Request) {
  const gate = await authorizeAdmin(req);
  if (gate.error) return gate.error;
  const domain = new URL(req.url).searchParams.get("domain");
  const runs = await listVisibilityRuns(gate.user.id, domain ? normalizeDomain(domain) : undefined);
  return NextResponse.json({ runs });
}

export async function POST(req: Request) {
  const gate = await authorizeAdmin(req);
  if (gate.error) return gate.error;

  let body: { brandName?: unknown; domain?: unknown; prompts?: unknown };
  try {
    body = (await readJsonObject(req)) as typeof body;
  } catch (error) {
    return NextResponse.json({ error: error instanceof BodyTooLargeError ? "Request body is too large." : "Invalid request body." }, { status: error instanceof BodyTooLargeError ? 413 : 400 });
  }

  const brandName = typeof body.brandName === "string" ? body.brandName.trim().slice(0, 80) : "";
  const domain = typeof body.domain === "string" ? normalizeDomain(body.domain) : "";
  if (!brandName || !domain || !domain.includes(".")) {
    return NextResponse.json({ error: "brandName and domain are required." }, { status: 400 });
  }

  if (body.prompts !== undefined && (!Array.isArray(body.prompts) || body.prompts.length > MAX_PROMPTS ||
      body.prompts.some(prompt => typeof prompt !== "string" || !prompt.trim() || prompt.length > 200))) {
    return NextResponse.json({ error: "Provide up to 10 nonempty prompts, each at most 200 characters." }, { status: 400 });
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
  const engineNames = engines.map((e) => e.name);
  if (summary.checked === 0) {
    return NextResponse.json({ error: "AI visibility is unavailable: no engine returned a usable answer.", results: summary.results }, { status: 502 });
  }
  // Only keep runs where at least one engine answered; an all-error run says nothing about the brand.
  const saved = summary.checked > 0 ? await saveVisibilityRun(gate.user.id, { name: brandName, domain }, finalPrompts, engineNames, summary) : false;
  return NextResponse.json({ brand: { name: brandName, domain }, prompts: finalPrompts, engines: engineNames, saved, ...summary });
}
