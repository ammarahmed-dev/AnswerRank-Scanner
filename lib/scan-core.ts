import { createScoringMethodology } from "@/lib/scoring-policy";
import { getScanCategoryScores } from "@/lib/report-category-scores";
import {
  fetchHtmlPage,
  fetchJinaReaderText,
  normalizeUrl,
  parseHtmlToScrapedData,
  parseReaderTextToScrapedData,
  validateUrl,
} from "@/lib/scrape";
import { getPageSpeedScore } from "@/lib/pagespeed";
import { assertPublicUrl, safeFetch, type SafeResponse } from "@/lib/url-safety";
import { calculateScore, runDeterministicChecks } from "@/lib/score-engine";
import { readBoundedText } from "@/lib/bounded-body";
import { analyzeAiCrawlerAccess } from "@/lib/robots";
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
  signal?: AbortSignal;
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
  methodology: NonNullable<ScanResult["methodology"]>;
};

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

async function scrapeUrlWithFallback(url: string, signal?: AbortSignal): Promise<ScrapedData> {
  try {
    const { html, finalUrl } = await fetchHtmlPage(url, signal);
    if (!html.trim()) throw new Error("Website returned empty HTML.");
    return parseHtmlToScrapedData(html, finalUrl);
  } catch {
    signal?.throwIfAborted();
    const readerText = await fetchJinaReaderText(url, signal);
    const data = parseReaderTextToScrapedData(readerText, url);
    // A CAPTCHA/bot wall comes back as a title with (almost) no content: report it as blocked
    // instead of scoring an empty page.
    if (data.wordCount < 40) throw new Error("scrape:jina:thin");
    return data;
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
  maxRedirects = 2,
  signal?: AbortSignal
): Promise<{ response: SafeResponse; body: string; finalUrl: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const { response, finalUrl } = await safeFetch(targetUrl, {
      signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal,
      maxRedirects,
      headers: {
        "User-Agent": "AEOCheckScanner/1.0 (+https://www.aeocheck.co)",
        Accept: "text/plain, application/xml, text/xml;q=0.9, */*;q=0.8",
      },
    });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return { response, body: "", finalUrl };
    }
    const body = await readBoundedText(response, 2_500_000);
    return { response, body, finalUrl };
  } finally {
    clearTimeout(timeout);
  }
}

async function checkRobotsTxt(baseUrl: string, signal?: AbortSignal): Promise<RobotsValidationResult> {
  const candidates = [new URL(baseUrl).origin];
  if (!candidates.length) {
    return { status: "warn", detail: "robots.txt could not be verified" };
  }

  let sawNotFound = false;
  for (const candidate of candidates) {
    const robotsUrl = `${candidate}/robots.txt`;
    try {
      const { response, body, finalUrl } = await fetchWithTimeoutAndRedirects(robotsUrl, 5000, 5, signal);
      if (response.status === 404) {
        sawNotFound = true;
        continue;
      }
      if (response.status !== 200) continue;

      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (!/<(?:!doctype|html|head|body)\b/i.test(body) &&
          (contentType.includes("text/plain") || /^\s*user-agent\s*:/im.test(body))) {
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

async function checkSitemapXml(baseUrl: string, robotsBody?: string, signal?: AbortSignal): Promise<TrustValidationResult> {
  const robotsSitemapUrl = extractSitemapFromRobots(robotsBody);
  const candidates: string[] = [];
  if (robotsSitemapUrl) {
    candidates.push(robotsSitemapUrl);
  } else {
    for (const domain of [new URL(baseUrl).origin]) {
      candidates.push(`${domain}/sitemap.xml`);
    }
  }
  if (!candidates.length) {
    return { status: "warn", detail: "sitemap.xml could not be verified" };
  }

  let sawNotFound = false;
  for (const sitemapUrl of candidates) {
    try {
      const { response, body } = await fetchWithTimeoutAndRedirects(sitemapUrl, 5000, 2, signal);
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
  options.signal?.throwIfAborted();
  const includePageSpeed = options.includePageSpeed ?? true;
  const normalizeAndValidate = options.normalizeAndValidate ?? true;

  const url = normalizeAndValidate ? normalizeUrl(rawUrl) : rawUrl;
  if (normalizeAndValidate && !validateUrl(url)) {
    throw new Error("Invalid URL. Only public http(s) URLs are supported.");
  }
  // Single choke point for every caller (scan, competitors, monitors, cron, audits).
  await assertPublicUrl(url);

  options.onProgress?.("fetch_started");
  const scrapedData = await scrapeUrlWithFallback(url, options.signal);
  options.onProgress?.("fetch_complete");

  if (!scrapedData.bodyText && !scrapedData.title && !scrapedData.metaDescription) {
    throw new Error("Could not extract meaningful content from this page.");
  }
  options.onProgress?.("parse_complete");

  const baseChecks = runDeterministicChecks(scrapedData);
  const resolvedUrl = scrapedData.url;
  const robotsCheck = await checkRobotsTxt(resolvedUrl, options.signal);
  const sitemapCheck = await checkSitemapXml(resolvedUrl, robotsCheck.body, options.signal);

  const robotsBody = robotsCheck.body ?? "";
  let aiBotStatus: "pass" | "warn" | "fail";
  let aiBotDetail: string;
  if (!robotsBody) {
    aiBotStatus = "warn";
    aiBotDetail = robotsCheck.status === "fail"
      ? "robots.txt not found - AI bot access cannot be verified"
      : "AI crawler access could not be verified from robots.txt";
  } else {
    const access = analyzeAiCrawlerAccess(robotsBody, new URL(resolvedUrl).pathname + new URL(resolvedUrl).search);
    aiBotStatus = access.status;
    aiBotDetail = access.detail;
  }

  let llmsTxtStatus: "pass" | "warn" | "fail" = "warn";
  let llmsTxtDetail = "No llms.txt file found - add one to guide AI crawlers";
  try {
    const llmsUrl = new URL("/llms.txt", resolvedUrl).toString();
    const { response: llmsRes } = await safeFetch(llmsUrl, {
      method: "GET",
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(5000)]) : AbortSignal.timeout(5000),
      headers: { "User-Agent": "AEOCheckScanner/1.0 (+https://www.aeocheck.co)" },
    });
    if (llmsRes.ok) {
      const llmsBody = await readBoundedText(llmsRes, 500_000);
      const contentType = llmsRes.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !/<(?:!doctype|html|head|body)\b/i.test(llmsBody) && /^#\s+\S/m.test(llmsBody)) {
        llmsTxtStatus = "pass";
        llmsTxtDetail = "llms.txt found with a Markdown heading - optional guidance is available";
      } else {
        llmsTxtDetail = "llms.txt did not contain recognizable Markdown guidance";
      }
    } else {
      await llmsRes.body?.cancel().catch(() => undefined);
    }
  } catch {
    // keep warn
  }

  scrapedData.hasRobotsTxt = robotsCheck.status === "pass";
  scrapedData.hasSitemap = sitemapCheck.status === "pass";
  scrapedData.allowsAiBots = aiBotStatus === "pass";
  scrapedData.hasLlmsTxt = llmsTxtStatus === "pass";

  options.onProgress?.("pagespeed_started");
  let pagespeed: ScanResult["pagespeed"] = null;
  let pagespeedResult: Awaited<ReturnType<typeof getPageSpeedScore>> | null = null;
  if (includePageSpeed) {
    try {
      const psResult = await getPageSpeedScore(resolvedUrl, options.signal);
      pagespeedResult = psResult;
      if (psResult.score !== null) {
        pagespeed = {
          score: psResult.score,
          lcp: psResult.lcp ?? null,
          cls: psResult.cls ?? null,
          tbt: psResult.tbt ?? null,
        };
      }
    } catch {
      // leave unavailable
    }
  }

  let cwvStatus: "pass" | "warn" | "fail" = "warn";
  let cwvDetail = "PageSpeed lab data unavailable - real-user Core Web Vitals were not assessed";
  if (pagespeedResult && typeof pagespeedResult.score === "number") {
    const { lcp, cls, tbt, score } = pagespeedResult;
    const parts: string[] = [];
    if (typeof lcp === "number") parts.push(`LCP ${lcp}s`);
    if (typeof cls === "number") parts.push(`CLS ${cls}`);
    if (typeof tbt === "number") parts.push(`TBT ${tbt}ms`);

    const lcpOk = typeof lcp !== "number" || lcp < 2.5;
    const clsOk = typeof cls !== "number" || cls < 0.1;
    const tbtOk = typeof tbt !== "number" || tbt < 200;
    const scoreOk = score >= 75;

    if (scoreOk && lcpOk && clsOk && tbtOk) {
      cwvStatus = "pass";
      cwvDetail = parts.length
        ? `Good lab performance: ${parts.join(", ")} - PageSpeed ${score}/100`
        : `Good performance score (${score}/100)`;
    } else if (score >= 50) {
      cwvStatus = "warn";
      const issues: string[] = [];
      if (!lcpOk && typeof lcp === "number") issues.push(`LCP ${lcp}s (target <2.5s)`);
      if (!clsOk && typeof cls === "number") issues.push(`CLS ${cls} (target <0.1)`);
      if (!tbtOk && typeof tbt === "number") issues.push(`TBT ${tbt}ms (target <200ms)`);
      cwvDetail = issues.length
        ? `Lab performance needs work: ${issues.join(", ")} - PageSpeed ${score}/100`
        : `Performance needs improvement (${score}/100)`;
    } else {
      cwvStatus = "fail";
      const issues: string[] = [];
      if (!lcpOk && typeof lcp === "number") issues.push(`LCP ${lcp}s (target <2.5s)`);
      if (!clsOk && typeof cls === "number") issues.push(`CLS ${cls} (target <0.1)`);
      if (!tbtOk && typeof tbt === "number") issues.push(`TBT ${tbt}ms (target <200ms)`);
      cwvDetail = issues.length
        ? `Poor lab performance: ${issues.join(", ")} - PageSpeed ${score}/100`
        : `Poor performance score (${score}/100) - needs significant improvement`;
    }
  }

  options.signal?.throwIfAborted();
  const checks = applyTrustValidationChecks(
    baseChecks,
    robotsCheck,
    sitemapCheck,
    { status: aiBotStatus, detail: aiBotDetail },
    { status: llmsTxtStatus, detail: llmsTxtDetail },
    { status: cwvStatus, detail: cwvDetail }
  );
  const score = calculateScore(checks);
  const categoryScores = getScanCategoryScores(checks, pagespeed);
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
    methodology: createScoringMethodology({
      pageSource: scrapedData.source === "reader" ? "reader" : "html",
      requestedUrl: url,
      resolvedUrl: scrapedData.source === "reader" ? undefined : scrapedData.url,
      finalUrlVerified: scrapedData.source !== "reader",
      pageSpeed: !includePageSpeed ? "not_requested" : pagespeed ? "measured" : "unavailable",
    }),
  };
}
