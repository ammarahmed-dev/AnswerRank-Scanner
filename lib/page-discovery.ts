import { safeFetch } from "@/lib/url-safety";
const EXCLUDED_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/register",
  "/auth",
  "/signin",
  "/auth/",
  "/dashboard",
  "/admin",
  "/monitor",
  "/audit",
  "/report",
  "/api/",
  "/_next",
  "/404",
  "/500",
  "/error",
];

const EXCLUDED_EXTENSIONS = [
  ".webmanifest",
  ".xml",
  ".json",
  ".txt",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".webp",
  ".woff",
  ".woff2",
  ".ttf",
  ".css",
  ".js",
  ".zip",
];

function normalizeUrl(href: string, base: URL): string | null {
  try {
    const resolved = new URL(href, base);
    resolved.hash = "";
    resolved.search = "";
    if (resolved.hostname !== base.hostname) return null;
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return null;

    const path = resolved.pathname.toLowerCase();
    const normalizedPath = path !== "/" && path.endsWith("/") ? path.slice(0, -1) : path;

    for (const ext of EXCLUDED_EXTENSIONS) {
      if (normalizedPath.endsWith(ext)) return null;
    }

    for (const prefix of EXCLUDED_PATH_PREFIXES) {
      const prefixNormalized = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
      if (
        normalizedPath === prefixNormalized ||
        normalizedPath.startsWith(prefixNormalized + "/")
      ) {
        return null;
      }
    }

    // Normalize trailing slash (canonical form: no trailing slash except root)
    if (resolved.pathname !== "/" && resolved.pathname.endsWith("/")) {
      resolved.pathname = resolved.pathname.slice(0, -1);
    }

    return resolved.href;
  } catch {
    return null;
  }
}

async function fetchHtml(url: string, timeoutMs = 10000): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const { response: res } = await safeFetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "AEOCheck-Audit/1.0 (+https://www.aeocheck.co/)" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("text/xml") && !ct.includes("application/xml")) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractLinksFromHtml(html: string, base: URL): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  // Exclude hrefs that start with ? or # or contain query strings at start
  const hrefRe = /href=["']([^"'#][^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    const raw = m[1];
    // Skip if raw href starts with ? (relative query)
    if (raw.startsWith("?")) continue;
    const normalized = normalizeUrl(raw, base);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      results.push(normalized);
    }
  }
  return results;
}

function extractSitemapUrls(xml: string, base: URL, maxPages: number): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  const locRe = /<loc>\s*([^<]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = locRe.exec(xml)) !== null && results.length < maxPages) {
    const normalized = normalizeUrl(m[1].trim(), base);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      results.push(normalized);
    }
  }
  return results;
}

function isLocaleSegment(segment: string): boolean {
  return /^[a-z]{2}(-[a-z]{2,4})?$/i.test(segment);
}

function getPathTemplate(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "/";
  if (isLocaleSegment(segments[0])) {
    const rest = segments.slice(1);
    return rest.length === 0 ? "/" : "/" + rest.join("/");
  }
  return pathname;
}

function dedupeLocaleVariants(urls: string[]): string[] {
  const seenTemplates = new Set<string>();
  const result: string[] = [];
  for (const url of urls) {
    try {
      const u = new URL(url);
      const template = u.hostname + getPathTemplate(u.pathname);
      if (!seenTemplates.has(template)) {
        seenTemplates.add(template);
        result.push(url);
      }
    } catch {
      result.push(url);
    }
  }
  return result;
}

export async function discoverPages(
  domain: string,
  maxPages: number
): Promise<{ urls: string[]; totalDiscovered: number }> {
  const baseUrl = domain.startsWith("http") ? domain : `https://${domain}`;
  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return { urls: [], totalDiscovered: 0 };
  }

  const DISCOVERY_CAP = maxPages * 3;
  const CONCURRENCY = 3;

  // discovered: every valid same-domain URL found (seeded before fetch)
  // visited:    pages we have actually fetched and link-extracted
  const discovered = new Set<string>();
  const visited = new Set<string>();
  const queue: string[] = [];

  function enqueue(url: string) {
    if (!discovered.has(url)) {
      discovered.add(url);
      queue.push(url);
    }
  }

  // 1. Seed with homepage
  enqueue(base.href);

  // 2. Seed from sitemap.xml so sites with deep links but good sitemaps
  //    get all their URLs in the queue before BFS begins
  const sitemapXml = await fetchHtml(`${base.origin}/sitemap.xml`, 8000);
  if (sitemapXml) {
    const sitemapUrls = extractSitemapUrls(sitemapXml, base, DISCOVERY_CAP);
    for (const u of dedupeLocaleVariants(sitemapUrls)) enqueue(u);
  }

  // 3. BFS - process queue in batches of CONCURRENCY
  //    BFS order = shallowest pages first because we enqueue children
  //    only after visiting the parent, and queue is FIFO.
  while (queue.length > 0 && visited.size < DISCOVERY_CAP) {
    const batch = queue.splice(0, CONCURRENCY);
    await Promise.all(
      batch.map(async (url) => {
        if (visited.has(url)) return;
        visited.add(url);

        const html = await fetchHtml(url, 8000);
        if (!html) return;

        // Resolve links relative to the current page URL
        const pageBase = (() => { try { return new URL(url); } catch { return base; } })();
        const links = extractLinksFromHtml(html, pageBase);
        for (const link of links) enqueue(link);
      })
    );
  }

  // 4. Locale-dedup the full discovered set, then cap to maxPages
  const dedupedUrls = dedupeLocaleVariants(Array.from(discovered));

  return {
    urls: dedupedUrls.slice(0, maxPages),
    totalDiscovered: dedupedUrls.length,
  };
}
