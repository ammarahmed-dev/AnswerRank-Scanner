import { NextResponse } from "next/server";
import { normalizeUrl, validateUrl } from "@/lib/scrape";
import { assertPublicUrl, pinnedFetch, safeFetch } from "@/lib/url-safety";
import { getAuthContext } from "@/lib/auth-server";
import { commitUsage, getClientKey, releaseUsage, reserveUsage } from "@/lib/usage-limits";
import { runWithBudget } from "@/lib/batch";
import { analyzeUrlset, parseSitemap, sitemapsFromRobots, type SitemapEntry, type SitemapIssue } from "@/lib/sitemap-check";

export const runtime = "nodejs";
export const maxDuration = 45;

// Free tool: validate a site's sitemap. A handful of fetches, no AI cost.
const TOOL_MONTHLY_LIMIT = 20;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_CHILDREN = 5;
const UA = "Mozilla/5.0 (compatible; AEOCheckScanner/1.0; +https://www.aeocheck.co)";

async function fetchText(url: string, timeoutMs = 10_000): Promise<{ status: number; text: string }> {
  const { response } = await safeFetch(url, { headers: { "User-Agent": UA, Accept: "application/xml,text/xml,text/plain,*/*" }, signal: AbortSignal.timeout(timeoutMs) });
  const text = response.status === 200 ? (await response.text()).slice(0, MAX_BYTES) : "";
  if (response.status !== 200) await response.body?.cancel().catch(() => undefined);
  return { status: response.status, text };
}

type Child = { url: string; urlCount?: number; error?: string };

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
  if (!validateUrl(url)) return NextResponse.json({ error: "Only public http(s) URLs are supported." }, { status: 400 });
  try {
    await assertPublicUrl(url);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  const parsed = new URL(url);
  const origin = parsed.origin;
  const direct = /\.xml$/i.test(parsed.pathname) ? url : null;

  const auth = await getAuthContext(req);
  const clientId = typeof body.clientId === "string" ? body.clientId : undefined;
  const usageKey = `tool:sitemap:${auth.user ? `user:${auth.user.id}` : getClientKey(clientId, req)}`;
  const usage = await reserveUsage(usageKey, TOOL_MONTHLY_LIMIT);
  if (!usage.allowed) {
    return NextResponse.json({ error: `You've used the sitemap checker ${TOOL_MONTHLY_LIMIT} times this month. Try again next month or run a full scan.` }, { status: 429 });
  }

  try {
    const issues: SitemapIssue[] = [];
    let robotsSitemaps: string[] = [];
    let robotsFound = false;
    try {
      const robots = await fetchText(`${origin}/robots.txt`, 8000);
      robotsFound = robots.status === 200;
      robotsSitemaps = sitemapsFromRobots(robots.text);
    } catch {
      // robots.txt unreachable: fall back to default sitemap locations.
    }

    const candidates = direct ? [direct] : [...new Set([...robotsSitemaps, `${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`])];
    let sitemapUrl = "";
    let parsedSitemap: ReturnType<typeof parseSitemap> | null = null;
    const tried: string[] = [];
    for (const candidate of candidates.slice(0, 5)) {
      try {
        await assertPublicUrl(candidate);
        if (/\.gz$/i.test(candidate)) { tried.push(`${candidate} (gzip not supported)`); continue; }
        const res = await fetchText(candidate);
        if (res.status !== 200) { tried.push(`${candidate} (HTTP ${res.status})`); continue; }
        const result = parseSitemap(res.text);
        if (result.kind === "invalid") { tried.push(`${candidate} (${result.reason})`); continue; }
        sitemapUrl = candidate;
        parsedSitemap = result;
        break;
      } catch {
        tried.push(`${candidate} (could not be fetched)`);
      }
    }

    if (!parsedSitemap) {
      await commitUsage(usageKey, usage);
      return NextResponse.json({ origin, found: false, tried, robotsFound, issues: [{ level: "error", message: "No valid sitemap found. Create a sitemap.xml and list it in robots.txt with a Sitemap: line." }] });
    }

    let entries: SitemapEntry[] = [];
    let children: Child[] = [];
    if (parsedSitemap.kind === "urlset") {
      entries = parsedSitemap.entries;
    } else if (parsedSitemap.kind === "index") {
      const childUrls = parsedSitemap.children.slice(0, MAX_CHILDREN);
      if (parsedSitemap.children.length > MAX_CHILDREN) issues.push({ level: "info", message: `The index lists ${parsedSitemap.children.length} sitemaps; the first ${MAX_CHILDREN} were checked.` });
      const results: Child[] = [];
      await runWithBudget(
        childUrls,
        async (child) => {
          try {
            await assertPublicUrl(child);
            const res = await fetchText(child);
            if (res.status !== 200) return void results.push({ url: child, error: `HTTP ${res.status}` });
            const r = parseSitemap(res.text);
            if (r.kind !== "urlset") return void results.push({ url: child, error: r.kind === "invalid" ? r.reason : "Nested sitemap index" });
            entries.push(...r.entries);
            results.push({ url: child, urlCount: r.entries.length });
          } catch {
            results.push({ url: child, error: "Could not be fetched" });
          }
        },
        { concurrency: 3, budgetMs: 20_000 }
      );
      children = childUrls.map((u) => results.find((r) => r.url === u) ?? { url: u, error: "Not checked (time budget)" });
      for (const c of children.filter((x) => x.error)) issues.push({ level: "error", message: `Child sitemap ${c.url} failed: ${c.error}.` });
    }

    const analysis = analyzeUrlset(entries, origin);
    issues.push(...analysis.issues);
    const inRobots = robotsSitemaps.some((s) => s.replace(/\/$/, "") === sitemapUrl.replace(/\/$/, ""));
    if (robotsFound && !direct && !inRobots) issues.push({ level: "warning", message: "robots.txt does not reference this sitemap. Add a line: Sitemap: " + sitemapUrl });
    if (!robotsFound && !direct) issues.push({ level: "info", message: "No robots.txt was found to point crawlers at the sitemap." });

    const siteHost = parsed.hostname.replace(/^www\./, "");
    const sample = analysis.sample.filter((u) => { try { return new URL(u).hostname.replace(/^www\./, "") === siteHost; } catch { return false; } }).slice(0, 8);
    const statuses: Array<{ url: string; status: number | null; location?: string }> = [];
    await runWithBudget(
      sample,
      async (u) => {
        try {
          const res = await pinnedFetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000) });
          await res.body?.cancel().catch(() => undefined);
          statuses.push({ url: u, status: res.status, location: res.headers.get("location") ?? undefined });
        } catch {
          statuses.push({ url: u, status: null });
        }
      },
      { concurrency: 4, budgetMs: 12_000 }
    );
    const ordered = sample.map((u) => statuses.find((s) => s.url === u)).filter((s): s is NonNullable<typeof s> => Boolean(s));
    const broken = ordered.filter((s) => s.status !== null && s.status >= 400);
    const redirected = ordered.filter((s) => s.status !== null && s.status >= 300 && s.status < 400);
    if (broken.length) issues.push({ level: "error", message: `${broken.length} of ${ordered.length} sampled URLs return an error status (for example ${broken[0].url} returned ${broken[0].status}). Remove dead URLs from the sitemap.` });
    if (redirected.length) issues.push({ level: "warning", message: `${redirected.length} of ${ordered.length} sampled URLs redirect. List the final URLs instead.` });

    await commitUsage(usageKey, usage);
    return NextResponse.json({
      origin,
      found: true,
      sitemapUrl,
      kind: parsedSitemap.kind,
      inRobots,
      robotsFound,
      children,
      urlCount: analysis.urlCount,
      uniqueUrlCount: analysis.uniqueUrlCount,
      withLastmod: analysis.withLastmod,
      issues,
      statuses: ordered,
    });
  } catch {
    await releaseUsage(usageKey, usage);
    return NextResponse.json({ error: "We couldn't check this site. Check the URL and try again." }, { status: 502 });
  }
}
