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
import { assertPublicUrl } from "@/lib/url-safety";
import { checkRobotsTxt, checkSitemapXml, checkLlmsTxt } from "@/lib/resource-diagnostics";
import { calculateScore, runDeterministicChecks } from "@/lib/score-engine";
import { analyzeAiCrawlerAccess } from "@/lib/robots";
import { CheckResult, ResourceDiagnostic, ScrapedData, ScanMetadata, ScanResult } from "@/types/index";

type TrustValidationStatus = "pass" | "warn" | "fail";
type TrustValidationResult = {
  status: TrustValidationStatus;
  detail: string;
  diagnostic?: ResourceDiagnostic;
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

function applyTrustValidationChecks(
  checks: CheckResult[],
  robots: TrustValidationResult,
  sitemap: TrustValidationResult,
  aiBotResult?: { status: "pass" | "warn" | "fail"; detail: string },
  llmsTxtResult?: TrustValidationResult,
  cwvResult?: { status: "pass" | "warn" | "fail"; detail: string }
): CheckResult[] {
  return checks.map((check) => {
    if (check.id === "robots") {
      return { ...check, status: robots.status, detail: robots.detail, diagnostic: robots.diagnostic };
    }
    if (check.id === "sitemap") {
      return { ...check, status: sitemap.status, detail: sitemap.detail, diagnostic: sitemap.diagnostic };
    }
    if (check.id === "ai_bot_access" && aiBotResult) {
      return { ...check, status: aiBotResult.status, detail: aiBotResult.detail };
    }
    if (check.id === "llms_txt" && llmsTxtResult) {
      return { ...check, status: llmsTxtResult.status, detail: llmsTxtResult.detail, diagnostic: llmsTxtResult.diagnostic };
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

  const llmsCheck = await checkLlmsTxt(resolvedUrl, options.signal);

  scrapedData.hasRobotsTxt = robotsCheck.status === "pass";
  scrapedData.hasSitemap = sitemapCheck.status === "pass";
  scrapedData.allowsAiBots = aiBotStatus === "pass";
  scrapedData.hasLlmsTxt = llmsCheck.status === "pass";

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
    llmsCheck,
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
      resources: { robots: robotsCheck.diagnostic, sitemap: sitemapCheck.diagnostic, llms: llmsCheck.diagnostic },
      pageSpeed: !includePageSpeed ? "not_requested" : pagespeed ? "measured" : "unavailable",
    }),
  };
}
