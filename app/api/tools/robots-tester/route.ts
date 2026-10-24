import { NextResponse } from "next/server";
import { normalizeUrl, validateUrl } from "@/lib/scrape";
import { assertPublicUrl, safeFetch } from "@/lib/url-safety";
import { getAuthContext } from "@/lib/auth-server";
import { commitUsage, getClientKey, releaseUsage, reserveUsage } from "@/lib/usage-limits";
import { testRobotsAccess } from "@/lib/robots";

export const runtime = "nodejs";
export const maxDuration = 30;

// Free tool: test whether a robots.txt allows a given crawler to fetch a given URL. Cheap (one fetch), generous quota.
const TOOL_MONTHLY_LIMIT = 30;
const MAX_ROBOTS_BYTES = 512 * 1024;

export async function POST(req: Request) {
  let body: { url?: unknown; agent?: unknown; clientId?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let url = "";
  try {
    url = normalizeUrl(typeof body.url === "string" ? body.url : "");
  } catch {
    return NextResponse.json({ error: "Enter a public website URL like https://example.com." }, { status: 400 });
  }
  if (!validateUrl(url)) {
    return NextResponse.json({ error: "Only public http(s) URLs are supported." }, { status: 400 });
  }
  try {
    await assertPublicUrl(url);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  const agent = (typeof body.agent === "string" ? body.agent : "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{1,60}$/.test(agent) && agent !== "*") {
    return NextResponse.json({ error: "Enter a crawler name like Googlebot or GPTBot." }, { status: 400 });
  }
  const parsed = new URL(url);
  const origin = parsed.origin;
  const pathWithQuery = `${parsed.pathname}${parsed.search}`;
  const robotsUrl = `${origin}/robots.txt`;

  const auth = await getAuthContext(req);
  const clientId = typeof body.clientId === "string" ? body.clientId : undefined;
  const usageKey = `tool:robotstest:${auth.user ? `user:${auth.user.id}` : getClientKey(clientId, req)}`;
  const usage = await reserveUsage(usageKey, TOOL_MONTHLY_LIMIT);
  if (usage.unavailable) {
    return NextResponse.json({ error: "Usage verification is temporarily unavailable. Please try again shortly." }, { status: 503 });
  }
  if (!usage.allowed) {
    return NextResponse.json(
      { error: `You've used the robots.txt tester ${TOOL_MONTHLY_LIMIT} times this month. Try again next month or run a full scan.` },
      { status: 429 }
    );
  }

  try {
    const { response, finalUrl } = await safeFetch(robotsUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AEOCheckScanner/1.0; +https://www.aeocheck.co)", Accept: "text/plain,*/*" },
      signal: AbortSignal.timeout(8000),
    });

    if (response.status === 404 || response.status === 410) {
      await commitUsage(usageKey, usage);
      return NextResponse.json({ origin, robotsUrl: finalUrl, found: false, agent, path: pathWithQuery, ...testRobotsAccess("", agent, pathWithQuery) });
    }
    if (response.status !== 200) {
      await releaseUsage(usageKey, usage);
      return NextResponse.json(
        {
          error:
            response.status === 401 || response.status === 403
              ? "This site blocks automated requests to robots.txt, so we could not read its rules. Open yourdomain.com/robots.txt in a browser to check them by hand."
              : `robots.txt returned HTTP ${response.status}, so we could not read the rules.`,
        },
        { status: 502 }
      );
    }

    const text = (await response.text()).slice(0, MAX_ROBOTS_BYTES);
    if (!/user-agent\s*:/i.test(text) && /<html[\s>]/i.test(text)) {
      await commitUsage(usageKey, usage);
      return NextResponse.json({ origin, robotsUrl: finalUrl, found: false, agent, path: pathWithQuery, ...testRobotsAccess("", agent, pathWithQuery) });
    }
    await commitUsage(usageKey, usage);
    return NextResponse.json({ origin, robotsUrl: finalUrl, found: true, agent, path: pathWithQuery, ...testRobotsAccess(text, agent, pathWithQuery), robotsTxt: text });
  } catch {
    await releaseUsage(usageKey, usage);
    return NextResponse.json({ error: "We couldn't fetch this site's robots.txt. Check the URL and try again." }, { status: 502 });
  }
}
