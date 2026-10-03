import {
  fetchHtml,
  fetchJinaReaderText,
  normalizeUrl,
  parseHtmlToScrapedData,
  parseReaderTextToScrapedData,
  validateUrl,
} from "@/lib/scrape";
import { getPageSpeedScore } from "@/lib/pagespeed";
import { assertPublicUrl, safeFetch } from "@/lib/url-safety";
import { calculateScore, runDeterministicChecks } from "@/lib/score-engine";
import { CheckResult, ScrapedData, ScanMetadata, ScanResult } from "@/types/index";

type TrustValidationStatus = "pass" | "warn" | "fail";
type TrustValidationResult = {
  status: TrustValidationStatus;
  detail: string;
};

type RobotsValidationResult = TrustValidationResult & {
  body?: string;
  finalUrl?: string;
};

type CoreProgressPhase =
  | "fetch_started"
  | "fetch_complete"
  | "parse_complete"
  | "pagespeed_started"
  | "pagespeed_complete"
  | "pagespeed_unavailable";

type RunScanCoreOptions = {
  includePageSpeed?: boolean;
  normalizeAndValidate?: boolean;
  onProgress?: (phase: CoreProgressPhase) => void;
};

export type ScanCoreResult = {
  url: string;
  scrapedData: ScrapedData;
  checks: CheckResult[];
  score: number;
  pagespeed: ScanResult["pagespeed"];
  pagespeedResult: Awaited<ReturnType<typeof getPageSpeedScore>> | null;
  categoryScores: {
    metadata?: number;
    headings?: number;
    schema?: number;
    contentClarity?: number;
    aiReadiness?: number;
    performance?: number;
    trustSignals?: number;
  };
  metadata: ScanMetadata;
};

function checkScore(status: CheckResult["status"]): number {
  if (status === "pass") return 100;
  if (status === "warn") return 60;
  return 25;
}

function categoryScoresFromChecks(checks: CheckResult[], pagespeed: { score: number } | null) {
  const byCategory = {
    metadata: checks.filter((c) => c.id === "title" || c.id === "meta_desc" || c.id.includes("og")),
    headings: checks.filter((c) => c.id.includes("heading") || c.id === "h1"),
    schema: checks.filter((c) => c.id.includes("schema")),
    contentClarity: checks.filter((c) => c.id === "word_count" || c.id === "internal_links" || c.id === "alt_text" || c.id === "readability"),
    aiReadiness: checks.filter((c) => !["title", "meta_desc", "h1", "heading_structure", "https", "robots", "sitemap", "word_count", "internal_links", "alt_text"].includes(c.id) && !c.id.includes("schema") && !c.id.includes("og")),
    trustSignals: checks.filter((c) => c.id === "https" || c.id === "robots" || c.id === "sitemap"),
  };
  const avg = (rows: CheckResult[]) => rows.length ? Math.round(rows.reduce((sum, row) => sum + checkScore(row.status), 0) / rows.length) : undefined;
  const readability = checks.find((c) => c.id === "readability");
  const rawContentScore = avg(byCategory.contentClarity);
  let contentClarity = rawContentScore;
  if (typeof contentClarity === "number" && readability?.status === "warn") {
    contentClarity = Math.min(contentClarity, 84);
  } else if (typeof contentClarity === "number" && readability?.status === "fail") {
    contentClarity = Math.min(contentClarity, 69);
  }
  return {
    metadata: avg(byCategory.metadata),
    headings: avg(byCategory.headings),
    schema: avg(byCategory.schema),
    contentClarity,
    aiReadiness: avg(byCategory.aiReadiness),
    performance: pagespeed?.score,
    trustSignals: avg(byCategory.trustSignals),
  };
}

function metadataFromScrapedData(scrapedData: ScrapedData): ScanMetadata {
  const h1 = scrapedData.headings.find((h) => h.startsWith("H1:"))?.replace(/^H1:\s*/, "") ?? "";
  return {
    title: scrapedData.title,
    metaDescription: scrapedData.metaDescription,
    ogTitle: scrapedData.ogTitle,
    ogDescription: scrapedData.ogDescription,
    ogImage: scrapedData.ogImage,
    canonical: scrapedData.canonical,
    h1,
  };
}

async function scrapeUrlWithFallback(url: string): Promise<ScrapedData> {
  try {
    const html = await fetchHtml(url);
    if (!html.trim()) throw new Error("Website returned empty HTML.");
    return parseHtmlToScrapedData(html, url);
  } catch {
    const readerText = await fetchJinaReaderText(url);
    return parseReaderTextToScrapedData(readerText, url);
  }
}

function getDomainCandidates(rawUrl: string): string[] {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    const normalizedHost = host.startsWith("www.") ? host.slice(4) : host;
    const withWww = normalizedHost.startsWith("www.") ? normalizedHost : `www.${normalizedHost}`;
    const primary = `https://${normalizedHost}`;
    const secondary = `https://${withWww}`;
    return host.startsWith("www.") ? [secondary, primary] : [primary, secondary];
  } catch {
    return [];
  }
}

function extractSitemapFromRobots(robotsBody?: string): string | null {
  if (!robotsBody) return null;
  const lines = robotsBody.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^sitemap:\s*(.+)$/i);
    if (!match) continue;
    const url = match[1].trim();
    try {
      return new URL(url).toString();
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchWithTimeoutAndRedirects(
  targetUrl: string,
  timeoutMs = 5000,
  maxRedirects = 2
): Promise<{ response: Response; body: string; finalUrl: string }> {
  let currentUrl = targetUrl;
  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      await assertPublicUrl(currentUrl);
      const response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "AEOCheckScanner/1.0 (+https://www.aeocheck.co)",
          Accept: "text/plain, application/xml, text/xml;q=0.9, */*;q=0.8",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        if (redirectCount === maxRedirects) {
          throw new Error("Redirect limit reached");
        }
        const location = response.headers.get("location");
        if (!location) throw new Error("Redirect response missing location");
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      const body = await response.text();
      return { response, body, finalUrl: currentUrl };
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("Unexpected redirect handling failure");
}

async function checkRobotsTxt(baseUrl: string): Promise<RobotsValidationResult> {
  const candidates = getDomainCandidates(baseUrl);
  if (!candidates.length) {
    return { status: "warn", detail: "robots.txt could not be verified" };
  }

  let sawNotFound = false;
  for (const candidate of candidates) {
    const robotsUrl = `${candidate}/robots.txt`;
    try {
      const { response, body, finalUrl } = await fetchWithTimeoutAndRedirects(robotsUrl, 5000, 2);
      if (response.status === 404) {
        sawNotFound = true;
        continue;
      }
      if (response.status !== 200) continue;

      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (contentType.includes("text/plain") || /user-agent\s*:/i.test(body)) {
        return {
          status: "pass",
          detail: "robots.txt found and accessible",
          body,
          finalUrl,
        };
      }
      return {
        status: "warn",
        detail: "robots.txt could not be verified",
        body,
        finalUrl,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("timeout") || message.includes("abort")) {
        return { status: "warn", detail: "robots.txt could not be verified" };
      }
      continue;
    }
  }

  if (sawNotFound) {
    return { status: "fail", detail: "robots.txt not found" };
  }
  return { status: "warn", detail: "robots.txt could not be verified" };
}

async function checkSitemapXml(baseUrl: string, robotsBody?: string): Promise<TrustValidationResult> {
  const robotsSitemapUrl = extractSitemapFromRobots(robotsBody);
  const candidates: string[] = [];
  if (robotsSitemapUrl) {
    candidates.push(robotsSitemapUrl);
  } else {
    for (const domain of getDomainCandidates(baseUrl)) {
      candidates.push(`${domain}/sitemap.xml`);
    }
  }
  if (!candidates.length) {
    return { status: "warn", detail: "sitemap.xml could not be verified" };
  }

  let sawNotFound = false;
  for (const sitemapUrl of candidates) {
    try {
      const { response, body } = await fetchWithTimeoutAndRedirects(sitemapUrl, 5000, 2);
      if (response.status === 404) {
        sawNotFound = true;
        continue;
      }
      if (response.status !== 200) continue;

      if (/<urlset\b/i.test(body) || /<sitemapindex\b/i.test(body)) {
        return { status: "pass", detail: "sitemap.xml found and valid" };
      }
      return { status: "warn", detail: "sitemap.xml could not be verified" };
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("timeout") || message.includes("abort")) {
        return { status: "warn", detail: "sitemap.xml could not be verified" };
      }
      continue;
    }
  }

  if (sawNotFound) {
    return { status: "fail", detail: "sitemap.xml not found" };
  }
  return { status: "warn", detail: "sitemap.xml could not be verified" };
}

function applyTrustValidationChecks(
  checks: CheckResult[],
  robots: TrustValidationResult,
  sitemap: TrustValidationResult,
  aiBotResult?: { status: "pass" | "warn" | "fail"; detail: string },
  llmsTxtResult?: { status: "pass" | "warn" | "fail"; detail: string },
  cwvResult?: { status: "pass" | "warn" | "fail"; detail: string }
): CheckResult[] {
  return checks.map((check) => {
    if (check.id === "robots") {
      return { ...check, status: robots.status, detail: robots.detail };
    }
    if (check.id === "sitemap") {
      return { ...check, status: sitemap.status, detail: sitemap.detail };
    }
    if (check.id === "ai_bot_access" && aiBotResult) {
      return { ...check, status: aiBotResult.status, detail: aiBotResult.detail };
    }
    if (check.id === "llms_txt" && llmsTxtResult) {
      return { ...check, status: llmsTxtResult.status, detail: llmsTxtResult.detail };
    }
    if (check.id === "core_web_vitals" && cwvResult) {
      return { ...check, status: cwvResult.status, detail: cwvResult.detail };
    }
    return check;
  });
}

export async function runScanCore(rawUrl: string, options: RunScanCoreOptions = {}): Promise<ScanCoreResult> {
  const includePageSpeed = options.includePageSpeed ?? true;
  const normalizeAndValidate = options.normalizeAndValidate ?? true;

  const url = normalizeAndValidate ? normalizeUrl(rawUrl) : rawUrl;
  if (normalizeAndValidate && !validateUrl(url)) {
    throw new Error("Invalid URL. Only public http(s) URLs are supported.");
  }
  // Single choke point for every caller (scan, competitors, monitors, cron, audits).
  await assertPublicUrl(url);

  options.onProgress?.("fetch_started");
  const scrapedData = await scrapeUrlWithFallback(url);
  options.onProgress?.("fetch_complete");

  if (!scrapedData.bodyText && !scrapedData.title && !scrapedData.metaDescription) {
    throw new Error("Could not extract meaningful content from this page.");
  }
  options.onProgress?.("parse_complete");

  const baseChecks = runDeterministicChecks(scrapedData);
  const robotsCheck = await checkRobotsTxt(url);
  const sitemapCheck = await checkSitemapXml(url, robotsCheck.body);

  const robotsBody = robotsCheck.body ?? "";
  const robotsLower = robotsBody.toLowerCase();
  const aiBots = ["gptbot", "claudebot", "perplexitybot", "googlebot-extended", "anthropic-ai", "cohere-ai"];
  let currentAgent = "";
  const blockedBots: string[] = [];
  let allAgentBlocked = false;

  for (const line of robotsBody.split(/\r?\n/)) {
    const trimmed = line.trim().toLowerCase();
    if (trimmed.startsWith("user-agent:")) {
      currentAgent = trimmed.replace("user-agent:", "").trim();
    } else if (trimmed.startsWith("disallow:")) {
      const path = trimmed.replace("disallow:", "").trim();
      if (path === "/" || path === "/*") {
        if (currentAgent === "*") allAgentBlocked = true;
        if (aiBots.includes(currentAgent)) blockedBots.push(currentAgent);
      }
    }
  }

  let aiBotStatus: "pass" | "warn" | "fail" = "pass";
  let aiBotDetail = "AI crawlers have access to this page";
  if (blockedBots.length > 0) {
    aiBotStatus = "fail";
    aiBotDetail = `AI bots blocked: ${blockedBots.join(", ")} - invisible to these AI search engines`;
  } else if (allAgentBlocked) {
    aiBotStatus = "warn";
    aiBotDetail = "All bots blocked by default - verify AI crawlers are explicitly allowed";
  } else if (!robotsBody) {
    aiBotStatus = "warn";
    aiBotDetail = robotsCheck.status === "fail"
      ? "robots.txt not found - AI bot access cannot be verified"
      : "robots.txt found but has no explicit AI crawler directives";
  } else if (robotsLower.includes("gptbot") && !robotsLower.includes("disallow")) {
    aiBotStatus = "pass";
    aiBotDetail = "GPTBot explicitly allowed in robots.txt";
  }

  let llmsTxtStatus: "pass" | "warn" | "fail" = "warn";
  let llmsTxtDetail = "No llms.txt file found - add one to guide AI crawlers";
  try {
    const llmsUrl = new URL("/llms.txt", robotsCheck.finalUrl ?? url).toString();
    const { response: llmsRes } = await safeFetch(llmsUrl, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "AEOCheckScanner/1.0 (+https://www.aeocheck.co)" },
    });
    if (llmsRes.ok) {
      const llmsBody = await llmsRes.text();
      if (llmsBody.trim().length > 0) {
        llmsTxtStatus = "pass";
        llmsTxtDetail = "llms.txt found - AI crawlers have structured guidance";
      }
    }
  } catch {
    // keep warn
  }

  scrapedData.hasRobotsTxt = robotsCheck.status !== "fail";
  scrapedData.hasSitemap = sitemapCheck.status !== "fail";
  scrapedData.allowsAiBots = aiBotStatus === "pass";
  scrapedData.hasLlmsTxt = llmsTxtStatus === "pass";

  options.onProgress?.("pagespeed_started");
  let pagespeed: ScanResult["pagespeed"] = null;
  let pagespeedResult: Awaited<ReturnType<typeof getPageSpeedScore>> | null = null;
  if (includePageSpeed) {
    try {
      const psResult = await getPageSpeedScore(url);
      pagespeedResult = psResult;
      if (psResult.score !== null) {
        pagespeed = {
          score: psResult.score,
          lcp: psResult.lcp ?? null,
          cls: psResult.cls ?? null,
          fid: psResult.fid ?? null,
        };
      }
    } catch {
      // leave unavailable
    }
  }

  let cwvStatus: "pass" | "warn" | "fail" = "warn";
  let cwvDetail = "PageSpeed data unavailable - Core Web Vitals could not be checked";
  if (pagespeedResult && typeof pagespeedResult.score === "number") {
    const { lcp, cls, fid, score } = pagespeedResult;
    const parts: string[] = [];
    if (typeof lcp === "number") parts.push(`LCP ${lcp}s`);
    if (typeof cls === "number") parts.push(`CLS ${cls}`);
    if (typeof fid === "number") parts.push(`TBT ${fid}ms`);

    const lcpOk = typeof lcp !== "number" || lcp < 2.5;
    const clsOk = typeof cls !== "number" || cls < 0.1;
    const fidOk = typeof fid !== "number" || fid < 200;
    const scoreOk = score >= 75;

    if (scoreOk && lcpOk && clsOk && fidOk) {
      cwvStatus = "pass";
      cwvDetail = parts.length
        ? `Good Core Web Vitals: ${parts.join(", ")} - PageSpeed ${score}/100`
        : `Good performance score (${score}/100)`;
    } else if (score >= 50) {
      cwvStatus = "warn";
      const issues: string[] = [];
      if (!lcpOk && typeof lcp === "number") issues.push(`LCP ${lcp}s (target <2.5s)`);
      if (!clsOk && typeof cls === "number") issues.push(`CLS ${cls} (target <0.1)`);
      if (!fidOk && typeof fid === "number") issues.push(`TBT ${fid}ms (target <200ms)`);
      cwvDetail = issues.length
        ? `CWV needs work: ${issues.join(", ")} - PageSpeed ${score}/100`
        : `Performance needs improvement (${score}/100)`;
    } else {
      cwvStatus = "fail";
      const issues: string[] = [];
      if (!lcpOk && typeof lcp === "number") issues.push(`LCP ${lcp}s (target <2.5s)`);
      if (!clsOk && typeof cls === "number") issues.push(`CLS ${cls} (target <0.1)`);
      if (!fidOk && typeof fid === "number") issues.push(`TBT ${fid}ms (target <200ms)`);
      cwvDetail = issues.length
        ? `Poor CWV: ${issues.join(", ")} - PageSpeed ${score}/100`
        : `Poor performance score (${score}/100) - needs significant improvement`;
    }
  }

  const checks = applyTrustValidationChecks(
    baseChecks,
    robotsCheck,
    sitemapCheck,
    { status: aiBotStatus, detail: aiBotDetail },
    { status: llmsTxtStatus, detail: llmsTxtDetail },
    { status: cwvStatus, detail: cwvDetail }
  );
  const score = calculateScore(checks);
  const categoryScores = categoryScoresFromChecks(checks, pagespeed);
  options.onProgress?.(pagespeed ? "pagespeed_complete" : "pagespeed_unavailable");

  return {
    url,
    scrapedData,
    checks,
    score,
    pagespeed,
    pagespeedResult,
    categoryScores,
    metadata: metadataFromScrapedData(scrapedData),
  };
}
