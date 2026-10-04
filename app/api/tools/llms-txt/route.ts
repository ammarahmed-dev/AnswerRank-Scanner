import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { fetchHtml, normalizeUrl, validateUrl } from "@/lib/scrape";
import { assertPublicUrl } from "@/lib/url-safety";
import { discoverPages } from "@/lib/page-discovery";
import { getAuthContext } from "@/lib/auth-server";
import { commitUsage, getClientKey, releaseUsage, reserveUsage } from "@/lib/usage-limits";
import { runWithBudget } from "@/lib/batch";
import { buildLlmsTxt, guessSiteName, rankPages, type LlmsPage } from "@/lib/llms-txt";

export const runtime = "nodejs";
export const maxDuration = 60;

// Free tool: generate a starter llms.txt for any public site. Separate monthly quota from scans.
const TOOL_MONTHLY_LIMIT = 10;
const MAX_PAGES = 12;

function readPage(html: string, url: string) {
  const $ = cheerio.load(html);
  const meta = (selector: string) => ($(selector).attr("content") ?? "").trim();
  return {
    url,
    title: ($("title").first().text() || meta('meta[property="og:title"]')).trim(),
    description: meta('meta[name="description"]') || meta('meta[property="og:description"]'),
    siteName: meta('meta[property="og:site_name"]'),
  };
}

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
  const origin = new URL(url).origin;

  const auth = await getAuthContext(req);
  const clientId = typeof body.clientId === "string" ? body.clientId : undefined;
  const usageKey = `tool:llms:${auth.user ? `user:${auth.user.id}` : getClientKey(clientId, req)}`;
  const usage = await reserveUsage(usageKey, TOOL_MONTHLY_LIMIT);
  if (!usage.allowed) {
    return NextResponse.json(
      { error: `You've generated ${TOOL_MONTHLY_LIMIT} llms.txt files this month. Try again next month or run a full scan.` },
      { status: 429 }
    );
  }

  try {
    const homeHtml = await fetchHtml(`${origin}/`);
    const home = readPage(homeHtml, `${origin}/`);
    const siteName = guessSiteName({ ogSiteName: home.siteName, title: home.title, url: origin });

    // Discover broadly, then keep the pages most worth listing.
    const { urls } = await discoverPages(origin, MAX_PAGES * 4);
    const others = rankPages(urls, origin, MAX_PAGES - 1);
    const pages: LlmsPage[] = [{ url: `${origin}/`, title: home.title || siteName, description: home.description }];

    await runWithBudget(
      others,
      async (pageUrl) => {
        try {
          const page = readPage(await fetchHtml(pageUrl), pageUrl);
          if (page.title) pages.push({ url: pageUrl, title: page.title, description: page.description });
        } catch {
          // Skip pages that fail to load.
        }
      },
      { concurrency: 4, budgetMs: 25_000 }
    );

    const llmsTxt = buildLlmsTxt({ siteName, summary: home.description, pages });
    await commitUsage(usageKey, usage);
    return NextResponse.json({ siteName, pageCount: pages.length, llmsTxt });
  } catch {
    await releaseUsage(usageKey, usage);
    return NextResponse.json(
      { error: "We couldn't read this site. It may block automated access. Check the URL and try again." },
      { status: 502 }
    );
  }
}
