import { NextResponse } from "next/server";
import { fetchHtml, normalizeUrl, validateUrl } from "@/lib/scrape";
import { assertPublicUrl } from "@/lib/url-safety";
import { getAuthContext } from "@/lib/auth-server";
import { commitUsage, getClientKey, releaseUsage, reserveUsage } from "@/lib/usage-limits";
import { checkSchema } from "@/lib/schema-check";

export const runtime = "nodejs";
export const maxDuration = 30;

// Free tool: inspect a page's JSON-LD. One fetch plus local parsing, no AI cost.
const TOOL_MONTHLY_LIMIT = 30;

export async function POST(req: Request) {
  let body: { url?: unknown; clientId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let url = "";
  try {
    url = normalizeUrl(typeof body.url === "string" ? body.url : "");
  } catch {
    return NextResponse.json({ error: "Enter a public page URL like https://example.com/pricing." }, { status: 400 });
  }
  if (!validateUrl(url)) {
    return NextResponse.json({ error: "Only public http(s) URLs are supported." }, { status: 400 });
  }
  try {
    await assertPublicUrl(url);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const auth = await getAuthContext(req);
  const clientId = typeof body.clientId === "string" ? body.clientId : undefined;
  const usageKey = `tool:schema:${auth.user ? `user:${auth.user.id}` : getClientKey(clientId, req)}`;
  const usage = await reserveUsage(usageKey, TOOL_MONTHLY_LIMIT);
  if (!usage.allowed) {
    return NextResponse.json(
      { error: `You've used the schema checker ${TOOL_MONTHLY_LIMIT} times this month. Try again next month or run a full scan.` },
      { status: 429 }
    );
  }

  try {
    const html = await fetchHtml(url);
    const result = checkSchema(html);
    await commitUsage(usageKey, usage);
    return NextResponse.json({ url, ...result });
  } catch {
    await releaseUsage(usageKey, usage);
    return NextResponse.json(
      { error: "We couldn't read this page. It may block automated access. Check the URL and try again." },
      { status: 502 }
    );
  }
}
