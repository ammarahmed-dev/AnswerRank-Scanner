import { runScanCore } from "@/lib/scan-core";
import { normalizeBadgeDomain, renderBadgeSvg } from "@/lib/badge";
import { commitUsage, releaseUsage, reserveUsage } from "@/lib/usage-limits";

export const runtime = "nodejs";
export const maxDuration = 30;

// Embeddable score badge. Visitors load it straight from other sites, so it must be cheap:
// the CDN caches each domain for a day and only a cache miss runs a scan (HTML fetch, no AI, no PageSpeed).
// A global monthly cap bounds the work an attacker could trigger by requesting many domains.
const GLOBAL_MONTHLY_BADGE_SCANS = 3000;

function svgResponse(svg: string, cache: string) {
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": cache, "X-Content-Type-Options": "nosniff" },
  });
}

const OK_CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
const SHORT_CACHE = "public, max-age=300, s-maxage=300";

export async function GET(req: Request) {
  const domain = normalizeBadgeDomain(new URL(req.url).searchParams.get("domain"));
  if (!domain) return svgResponse(renderBadgeSvg(null), SHORT_CACHE);

  const usageKey = "badge:global";
  const usage = await reserveUsage(usageKey, GLOBAL_MONTHLY_BADGE_SCANS);
  if (!usage.allowed) return svgResponse(renderBadgeSvg(null), SHORT_CACHE);

  try {
    const result = await runScanCore(`https://${domain}`, { includePageSpeed: false });
    await commitUsage(usageKey, usage);
    return svgResponse(renderBadgeSvg(result.score), OK_CACHE);
  } catch {
    await releaseUsage(usageKey, usage);
    return svgResponse(renderBadgeSvg(null), SHORT_CACHE);
  }
}
