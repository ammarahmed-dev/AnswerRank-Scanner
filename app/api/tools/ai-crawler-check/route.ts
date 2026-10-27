import { authUnavailableResponse } from "@/lib/auth-response";
import { BodyTooLargeError, readJsonObject, readBoundedText } from "@/lib/bounded-body";
import { NextResponse } from "next/server";
import { normalizeUrl, validateUrl } from "@/lib/scrape";
import { assertPublicUrl, safeFetch } from "@/lib/url-safety";
import { getAuthContext } from "@/lib/auth-server";
import { commitUsage, getClientKey, releaseUsage, reserveUsage } from "@/lib/usage-limits";
import { describeAiCrawlerAccess } from "@/lib/robots";

export const runtime = "nodejs";
export const maxDuration = 30;

// Free tool: show which AI crawlers a site's robots.txt allows. Cheap (one fetch), generous quota.
const TOOL_MONTHLY_LIMIT = 30;
const MAX_ROBOTS_BYTES = 512 * 1024;

export async function POST(req: Request) {
  let body: { url?: unknown; clientId?: unknown };
  try {
    body = (await readJsonObject(req)) as typeof body;
  } catch (error) {
    return NextResponse.json({ error: error instanceof BodyTooLargeError ? "Request body is too large." : "Invalid request body." }, { status: error instanceof BodyTooLargeError ? 413 : 400 });
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
  const target = new URL(url);
  const origin = target.origin;
  const pathWithQuery = target.pathname + target.search;
  const robotsUrl = `${origin}/robots.txt`;

  const auth = await getAuthContext(req);
  const authUnavailable = authUnavailableResponse(auth);
  if (authUnavailable) return authUnavailable;
  const clientId = typeof body.clientId === "string" ? body.clientId : undefined;
  const usageKey = `tool:crawlers:${auth.user ? `user:${auth.user.id}` : getClientKey(clientId, req)}`;
  const usage = await reserveUsage(usageKey, TOOL_MONTHLY_LIMIT);
  if (usage.unavailable) {
    return NextResponse.json({ error: "Usage verification is temporarily unavailable. Please try again shortly." }, { status: 503 });
  }
  if (!usage.allowed) {
    return NextResponse.json(
      { error: `You've used the AI crawler checker ${TOOL_MONTHLY_LIMIT} times this month. Try again next month or run a full scan.` },
      { status: 429 }
    );
  }

  try {
    const signal = AbortSignal.any([req.signal, AbortSignal.timeout(8000)]);
    const { response, finalUrl } = await safeFetch(robotsUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AEOCheckScanner/1.0; +https://www.aeocheck.co)", Accept: "text/plain,*/*" },
      signal,
    });

    if (response.status === 404) {
      await response.body?.cancel().catch(() => undefined);
      await commitUsage(usageKey, usage);
      return NextResponse.json({ origin, checkedUrl: url, requestedRobotsUrl: robotsUrl, robotsUrl: finalUrl, found: false, crawlers: describeAiCrawlerAccess("", pathWithQuery) });
    }
    if (response.status !== 200) {
      await response.body?.cancel().catch(() => undefined);
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

    const text = await readBoundedText(response, MAX_ROBOTS_BYTES, signal);
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (contentType.includes("text/html") || contentType.includes("application/xhtml+xml") ||
        /<(?:!doctype|html|head|body)\b/i.test(text) ||
        (!contentType.includes("text/plain") && !/^\s*user-agent\s*:/im.test(text))) {
      await releaseUsage(usageKey, usage);
      return NextResponse.json({ error: "The robots.txt response was not a verified text policy. No crawler access verdict is available; check the response and retry." }, { status: 502 });
    }
    await commitUsage(usageKey, usage);
    return NextResponse.json({ origin, checkedUrl: url, requestedRobotsUrl: robotsUrl, robotsUrl: finalUrl, found: true, crawlers: describeAiCrawlerAccess(text, pathWithQuery), robotsTxt: text });
  } catch {
    await releaseUsage(usageKey, usage);
    return NextResponse.json({ error: "We couldn't fetch this site's robots.txt. Check the URL and try again." }, { status: 502 });
  }
}
