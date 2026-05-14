import { NextRequest, NextResponse } from "next/server";
import {
  normalizeUrl,
  validateUrl,
  fetchHtml,
  fetchJinaReaderText,
  parseHtmlToScrapedData,
  parseReaderTextToScrapedData,
} from "@/lib/scrape";
import { runDeterministicChecks, calculateScore } from "@/lib/score-engine";
import { buildAIPrompt } from "@/lib/build-ai-prompt";
import { generateAIInsights } from "@/lib/ai-provider";
import { getPageSpeedScore } from "@/lib/pagespeed";
import { saveReportRecord } from "@/lib/report-db";
import { getAuthContext } from "@/lib/auth-server";
import { checkUsageLimit, getPlanLimit, incrementUsage } from "@/lib/usage-limits";
import { isMasterAdmin } from "@/lib/admin";
import { ScrapedData, ScanResult, AIInsights, CheckResult, CompetitorScanResult, ScanMetadata, SchemaRecommendation } from "@/types/index";

export const runtime = "nodejs";

// Simple in-memory rate limiter: store { url: timestamp }
const aiCallCache = new Map<string, number>();
const AI_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

function checkAIRateLimit(url: string): boolean {
  const lastCall = aiCallCache.get(url);
  const now = Date.now();

  if (!lastCall || now - lastCall > AI_COOLDOWN_MS) {
    aiCallCache.set(url, now);
    return true; // Allow AI call
  }
  return false; // Within cooldown
}

function errorResponse(error: string, status: number, details?: string) {
  return NextResponse.json({ error, details }, { status });
}

function normalizeSchemaType(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseSchemaRecommendations(parsed: Record<string, unknown>, fallbackDetected: string[]): SchemaRecommendation {
  const sr = parsed.schemaRecommendations as Record<string, unknown> | undefined;
  const detectedRaw = Array.isArray(sr?.detected)
    ? (sr.detected as string[]).filter((s): s is string => typeof s === "string")
    : fallbackDetected;
  const detected = Array.from(new Set(detectedRaw));
  const detectedSet = new Set(detected.map(normalizeSchemaType));

  const missingRaw = Array.isArray(sr?.missing)
    ? (sr.missing as string[]).filter((s): s is string => typeof s === "string")
    : [];
  const missing = Array.from(new Set(missingRaw)).filter(
    (type) => !detectedSet.has(normalizeSchemaType(type))
  );

  const rawPriority = typeof sr?.priority === "string" ? sr.priority : "";
  const priority = rawPriority && !detectedSet.has(normalizeSchemaType(rawPriority))
    ? rawPriority
    : (missing[0] ?? "");

  return {
    detected,
    missing,
    priority,
    reasoning: typeof sr?.reasoning === "string" ? sr.reasoning : "",
  };
}

async function getAIInsightsWithBudget(
  scrapedData: ScrapedData,
  context?: {
    overallScore: number;
    detectedSchemas: string[];
    missingSchemas: string[];
    scores: {
      metadata?: number;
      schema?: number;
      headings?: number;
      trustSignals?: number;
    };
    issues: string[];
  }
): Promise<AIInsights | null> {
  try {
    const prompt = buildAIPrompt(scrapedData, context);
    const aiRawResponse = await generateAIInsights(prompt);

    if (!aiRawResponse) return null;

    return parseAIInsights(aiRawResponse, scrapedData.schemaTypes);
  } catch (err: unknown) {
    console.error(
      "AI analysis failed:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return null;
  }
}

function parseAIInsights(raw: string, fallbackDetected: string[] = []): AIInsights {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      return {
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations.filter((item: unknown) => typeof item === "string").slice(0, 5)
          : [],
        quickWin:
          typeof parsed.quickWin === "string"
            ? parsed.quickWin
            : "Improve the clearest missing AI visibility signal first.",
        contentGap:
          typeof parsed.contentGap === "string"
            ? parsed.contentGap
            : "Add more explicit answer-focused content for the target audience.",
        summary:
          typeof parsed.summary === "string"
            ? parsed.summary
            : "AI analysis completed, but the summary was not returned in the expected shape.",
        schemaRecommendations: parseSchemaRecommendations(parsed as Record<string, unknown>, fallbackDetected),
      };
    } catch (err) {
      console.warn("AI response was not valid JSON; using text fallback.", err);
    }
  }

  return {
    recommendations: [
      "Add clear FAQ-style answer blocks for the most important buyer questions.",
      "Strengthen page metadata so the primary entity, offer, and audience are explicit.",
      "Add or expand structured data for Organization, WebPage, FAQPage, and relevant article/service types.",
    ],
    quickWin: "Add a concise FAQ section with matching FAQPage schema.",
    contentGap: "The page needs more explicit, answer-ready content that maps brand, category, audience, use cases, proof, FAQs, and schema.",
    summary: cleaned.slice(0, 500) || "AI analysis completed, but the provider returned an empty response.",
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type TrustValidationStatus = "pass" | "warn" | "fail";
type TrustValidationResult = {
  status: TrustValidationStatus;
  detail: string;
};

type RobotsValidationResult = TrustValidationResult & {
  body?: string;
  finalUrl?: string;
};

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
      const response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "AEOCheckScanner/1.0 (+https://aeocheck.co)",
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
  sitemap: TrustValidationResult
): CheckResult[] {
  return checks.map((check) => {
    if (check.id === "robots") {
      return { ...check, status: robots.status, detail: robots.detail };
    }
    if (check.id === "sitemap") {
      return { ...check, status: sitemap.status, detail: sitemap.detail };
    }
    return check;
  });
}

type ProgressStatus = "started" | "complete" | "skipped" | "error";
type ProgressEvent = {
  type: "progress";
  step: number;
  label: string;
  status: ProgressStatus;
};
type ResultEvent = {
  type: "result";
  result: ScanResult;
};
type ErrorEvent = {
  type: "error";
  message: string;
};
type ScanEvent = ProgressEvent | ResultEvent | ErrorEvent;

type ScanRequestBody = { url?: string; includeAI?: boolean; clientId?: string; competitorUrls?: string[] | string; retestOfReportId?: string };

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

function supabaseHeaders() {
  return {
    apikey: supabaseServiceRoleKey ?? "",
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
  };
}

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
    contentClarity: checks.filter((c) => c.id === "word_count" || c.id === "internal_links" || c.id === "alt_text"),
    aiReadiness: checks.filter((c) => !["title", "meta_desc", "h1", "heading_structure", "https", "robots", "sitemap", "word_count", "internal_links", "alt_text"].includes(c.id) && !c.id.includes("schema") && !c.id.includes("og")),
    trustSignals: checks.filter((c) => c.id === "https" || c.id === "robots" || c.id === "sitemap"),
  };
  const avg = (rows: CheckResult[]) => rows.length ? Math.round(rows.reduce((sum, row) => sum + checkScore(row.status), 0) / rows.length) : undefined;
  return {
    metadata: avg(byCategory.metadata),
    headings: avg(byCategory.headings),
    schema: avg(byCategory.schema),
    contentClarity: avg(byCategory.contentClarity),
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

async function scanCompetitor(rawUrl: string): Promise<CompetitorScanResult> {
  let normalizedUrl = rawUrl;
  try {
    normalizedUrl = normalizeUrl(rawUrl);
    if (!validateUrl(normalizedUrl)) throw new Error("Invalid competitor URL");
  } catch {
    return { url: rawUrl, error: "Could not scan competitor URL" };
  }

  const timeoutMs = Number(process.env.COMPETITOR_SCAN_TIMEOUT_MS ?? 25000);
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Competitor scan timed out")), timeoutMs);
  });

  const work = (async (): Promise<CompetitorScanResult> => {
    const scrapedData = await scrapeUrlWithFallback(normalizedUrl);
    const baseChecks = runDeterministicChecks(scrapedData);
    const robotsCheck = await checkRobotsTxt(normalizedUrl);
    const sitemapCheck = await checkSitemapXml(normalizedUrl, robotsCheck.body);
    const checks = applyTrustValidationChecks(baseChecks, robotsCheck, sitemapCheck);
    const score = calculateScore(checks);

    return {
      url: normalizedUrl,
      score,
      checks,
      categoryScores: categoryScoresFromChecks(checks, null),
      metadata: metadataFromScrapedData(scrapedData),
      pagespeed: null,
      summary: checks.find((check) => check.status !== "pass")?.detail ?? "Core visibility signals are in good shape.",
    };
  })();

  try {
    return await Promise.race([work, timeout]);
  } catch {
    return { url: normalizedUrl, error: "Could not scan competitor URL" };
  }
}

export async function POST(req: NextRequest) {
  let body: ScanRequestBody;
  try {
    body = (await req.json()) as ScanRequestBody;
  } catch {
    return errorResponse("Invalid request body.", 400);
  }

  const rawUrl = body?.url;
  if (!rawUrl || typeof rawUrl !== "string") {
    return errorResponse("Please provide a valid URL.", 400);
  }

  let url = "";
  try {
    url = normalizeUrl(rawUrl);
  } catch {
    return errorResponse("Invalid URL. Enter a public website URL like https://example.com.", 400);
  }

  if (!validateUrl(url)) {
    return errorResponse("Invalid URL. Only public http(s) URLs are supported.", 400);
  }

  const authContext = await getAuthContext(req);
  const effectivePlan = authContext.user && isMasterAdmin(authContext.user.email) ? "agency" : authContext.plan;
  const usageKey = authContext.user ? `user:${authContext.user.id}` : null;
  const usage = usageKey ? await checkUsageLimit(usageKey, getPlanLimit(effectivePlan)) : null;
  if (usage && !usage.allowed) {
    return NextResponse.json(
      {
        type: "limit_reached",
        error: "Youâ€™ve used your 3 free scans this month.",
        limit: usage.limit,
        remaining: usage.remaining,
      },
      { status: 429 }
    );
  }

  const enableAI = process.env.NEXT_PUBLIC_ENABLE_AI_REPORT !== "false";
  const wantAI = !!(body.includeAI && enableAI);
  const retestOfReportId = typeof body.retestOfReportId === "string" ? body.retestOfReportId.trim() : "";
  const competitorUrlsRaw = Array.isArray(body.competitorUrls)
    ? body.competitorUrls
    : typeof body.competitorUrls === "string"
      ? [body.competitorUrls]
      : [];
  const competitorLimit = effectivePlan === "agency" || effectivePlan === "pro" ? 3 : 1;
  const competitorUrls = [...new Set(competitorUrlsRaw.map((item) => item.trim()).filter(Boolean))].slice(0, competitorLimit);
  const userId = authContext.user?.id;
  let retestSeed: { unlocked: boolean; retestCount: number; maxRetests: number } | null = null;
  if (retestOfReportId && userId && hasSupabaseConfig()) {
    const params = new URLSearchParams({
      id: `eq.${retestOfReportId}`,
      user_id: `eq.${userId}`,
      select: "result,retest_count,max_retests",
      limit: "1",
    });
    try {
      const seedRes = await fetch(`${supabaseUrl}/rest/v1/reports?${params.toString()}`, {
        headers: supabaseHeaders(),
        cache: "no-store",
      });
      if (seedRes.ok) {
        const rows = (await seedRes.json()) as Array<{
          retest_count?: number;
          max_retests?: number;
          result?: { unlocked?: boolean; unlockedAt?: string };
        }>;
        const source = rows[0];
        if (source) {
          retestSeed = {
            unlocked: Boolean(source.result?.unlocked || source.result?.unlockedAt),
            retestCount: source.retest_count ?? 0,
            maxRetests: source.max_retests ?? 3,
          };
        }
      }
    } catch {
      retestSeed = null;
    }
  }
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: ScanEvent) {
        controller.enqueue(encoder.encode(`event: ${event.type}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      function emitProgress(step: number, label: string, status: ProgressStatus) {
        emit({ type: "progress", step, label, status });
      }

      function emitError(message: string) {
        emit({ type: "error", message });
      }

      try {
        emitProgress(1, "Preparing scan", "started");
        emitProgress(1, "Preparing scan", "complete");
        emitProgress(2, "Fetching website", "started");

        let scrapedData: ScrapedData;
        try {
          const html = await fetchHtml(url);
          if (!html.trim()) {
            emitError("Website returned empty HTML. Try another page URL.");
            controller.close();
            return;
          }
          scrapedData = parseHtmlToScrapedData(html, url);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.warn(`Direct fetch failed for ${url}; trying Jina Reader. ${message}`);
          try {
            const readerText = await fetchJinaReaderText(url);
            scrapedData = parseReaderTextToScrapedData(readerText, url);
          } catch (readerErr: unknown) {
            const readerMessage = readerErr instanceof Error ? readerErr.message : "Unknown error";
            console.error("Jina Reader also failed:", readerMessage);
            let errorMsg = "Could not fetch this website directly or through Jina Reader.";
            if (message.toLowerCase().includes("timeout") || message.toLowerCase().includes("aborted")) {
              errorMsg = "Request timed out while fetching this URL.";
            } else if (message.toLowerCase().includes("blocked")) {
              errorMsg = "This website blocked the scanner and Jina Reader could not recover the content.";
            }
            emitError(errorMsg);
            controller.close();
            return;
          }
        }
        emitProgress(2, "Fetching website", "complete");

        emitProgress(3, "Reading metadata and schema", "started");

        if (!scrapedData.bodyText && !scrapedData.title && !scrapedData.metaDescription) {
          emitError("Could not extract meaningful content from this page.");
          controller.close();
          return;
        }
        emitProgress(3, "Reading metadata and schema", "complete");

        const baseChecks = runDeterministicChecks(scrapedData);
        const robotsCheck = await checkRobotsTxt(url);
        const sitemapCheck = await checkSitemapXml(url, robotsCheck.body);
        const checks = applyTrustValidationChecks(baseChecks, robotsCheck, sitemapCheck);
        const score = calculateScore(checks);
        const categoryScores = categoryScoresFromChecks(checks, null);
        const detectedSchemas = scrapedData.schemaTypes;
        const candidateSchemaTypes = ["Organization", "WebSite", "WebPage", "FAQPage", "Article", "HowTo", "BreadcrumbList", "Service", "Product", "SoftwareApplication"];
        const missingSchemas = candidateSchemaTypes.filter(
          (type) => !detectedSchemas.some((detected) => detected.toLowerCase() === type.toLowerCase())
        );
        const issueTitles = checks
          .filter((check) => check.status !== "pass")
          .map((check) => check.label);

        emitProgress(4, "Running PageSpeed check", "started");

        let pagespeed: { score: number } | null = null;
        try {
          const psResult = await getPageSpeedScore(url);
          if (psResult.score !== null) {
            pagespeed = { score: psResult.score };
            emitProgress(4, "Running PageSpeed check", "complete");
          } else {
            if (psResult.error) {
              console.warn("PageSpeed unavailable:", psResult.error);
            }
            const isConfigIssue = (psResult.error ?? "").toLowerCase().includes("no google pagespeed api key configured");
            emitProgress(4, "PageSpeed unavailable, continuing", isConfigIssue ? "skipped" : "error");
          }
        } catch (err: unknown) {
          console.error("PageSpeed fetch failed:", err instanceof Error ? err.message : "Unknown error");
          emitProgress(4, "PageSpeed unavailable, continuing", "error");
        }

        const includeAIThisRequest = wantAI && checkAIRateLimit(url);
        emitProgress(5, "Generating AI insights", "started");

        let aiInsights: AIInsights | null = null;
        if (!wantAI) {
          emitProgress(5, "Using local recommendations", "skipped");
        } else if (!includeAIThisRequest) {
          emitProgress(5, "Using local recommendations", "skipped");
        } else {
          try {
            aiInsights = await getAIInsightsWithBudget(scrapedData, {
              overallScore: score,
              detectedSchemas,
              missingSchemas,
              scores: {
                metadata: categoryScores.metadata,
                schema: categoryScores.schema,
                headings: categoryScores.headings,
                trustSignals: categoryScores.trustSignals,
              },
              issues: issueTitles,
            });
            if (aiInsights) {
              emitProgress(5, "Generating AI insights", "complete");
            } else {
              emitProgress(5, "Using local recommendations", "skipped");
            }
          } catch (err: unknown) {
            console.error("AI insights failed:", err instanceof Error ? err.message : "Unknown error");
            emitProgress(5, "Using local recommendations", "error");
          }
        }

        let competitors: CompetitorScanResult[] | undefined;
        if (competitorUrls.length) {
          emitProgress(6, "Scanning competitor", "started");
          competitors = [await scanCompetitor(competitorUrls[0])];
        }

        emitProgress(6, "Preparing report", "started");
        const result: ScanResult = {
          url,
          score,
          checks,
          aiInsights,
          pagespeed,
          metadata: metadataFromScrapedData(scrapedData),
          competitorUrls: competitorUrls.length ? competitorUrls : undefined,
          competitors,
          scannedAt: new Date().toISOString(),
          unlocked: Boolean(retestSeed?.unlocked),
          retest_count: retestSeed?.retestCount ?? 0,
          max_retests: retestSeed?.maxRetests ?? 3,
        };

        const savedResult = await saveReportRecord(result, userId);
        if (usageKey && usage) {
          await incrementUsage(usageKey, usage.count + 1);
        }

        emitProgress(6, "Preparing report", "complete");
        await sleep(220);
        emit({ type: "result", result: savedResult });
        controller.close();
      } catch (err: unknown) {
        console.error("Stream error:", err);
        try {
          emitError("An unexpected error occurred. Please try again.");
          controller.close();
        } catch {
          controller.error(err);
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

