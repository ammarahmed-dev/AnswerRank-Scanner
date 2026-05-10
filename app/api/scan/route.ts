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
import { checkAndIncrementUsage, getClientKey, getPlanLimit } from "@/lib/usage-limits";
import { isMasterAdmin } from "@/lib/admin";
import { ScrapedData, ScanResult, AIInsights, SchemaRecommendation } from "@/types/index";

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

function parseSchemaRecommendations(parsed: Record<string, unknown>, fallbackDetected: string[]): SchemaRecommendation {
  const sr = parsed.schemaRecommendations as Record<string, unknown> | undefined;
  return {
    detected: Array.isArray(sr?.detected) ? (sr.detected as string[]).filter((s): s is string => typeof s === "string") : fallbackDetected,
    missing: Array.isArray(sr?.missing) ? (sr.missing as string[]).filter((s): s is string => typeof s === "string") : [],
    priority: typeof sr?.priority === "string" ? sr.priority : "",
    reasoning: typeof sr?.reasoning === "string" ? sr.reasoning : "",
  };
}

async function getAIInsightsWithBudget(
  scrapedData: ScrapedData
): Promise<AIInsights | null> {
  try {
    const prompt = buildAIPrompt(scrapedData);
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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      url?: string;
      includeAI?: boolean;
      clientId?: string;
    };

    const rawUrl = body?.url;
    if (!rawUrl || typeof rawUrl !== "string") {
      return errorResponse("Please provide a valid URL.", 400);
    }

    // Validate and normalize URL
    let url = "";
    try {
      url = normalizeUrl(rawUrl);
    } catch {
      return errorResponse(
        "Invalid URL. Enter a public website URL like https://example.com.",
        400
      );
    }

    if (!validateUrl(url)) {
      return errorResponse(
        "Invalid URL. Only public http(s) URLs are supported.",
        400
      );
    }

    const authContext = await getAuthContext(req);
    const effectivePlan = authContext.user && isMasterAdmin(authContext.user.email) ? "agency" : authContext.plan;
    const usageKey = authContext.user ? `user:${authContext.user.id}` : `guest:${getClientKey(body.clientId, req)}`;
    const usage = await checkAndIncrementUsage(usageKey, getPlanLimit(effectivePlan));
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: `Daily scan limit reached. Your ${effectivePlan} plan includes ${usage.limit} scans per day.`,
          limit: usage.limit,
          remaining: usage.remaining,
        },
        { status: 429 }
      );
    }

    // Fetch and parse page content. Jina Reader is a fallback for bot-blocked pages.
    let scrapedData: ScrapedData;
    try {
      const html = await fetchHtml(url);
      if (!html.trim()) {
        return errorResponse(
          "Website returned empty HTML. Try another page URL.",
          422
        );
      }
      scrapedData = parseHtmlToScrapedData(html, url);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown error";
      console.warn(`Direct fetch failed for ${url}; trying Jina Reader. ${message}`);
      try {
        const readerText = await fetchJinaReaderText(url);
        scrapedData = parseReaderTextToScrapedData(readerText, url);
      } catch (readerErr: unknown) {
        const readerMessage = readerErr instanceof Error ? readerErr.message : "Unknown error";
        if (
          message.toLowerCase().includes("timeout") ||
          message.toLowerCase().includes("aborted")
        ) {
          return errorResponse(
            "Request timed out while fetching this URL.",
            408,
            readerMessage
          );
        }
        if (message.toLowerCase().includes("blocked")) {
          return errorResponse(
            "This website blocked the scanner and Jina Reader could not recover the content.",
            422,
            readerMessage
          );
        }
        return errorResponse(
          "Could not fetch this website directly or through Jina Reader.",
          422,
          readerMessage
        );
      }
    }

    if (
      !scrapedData.bodyText &&
      !scrapedData.title &&
      !scrapedData.metaDescription
    ) {
      return errorResponse(
        "Could not extract meaningful content from this page.",
        422
      );
    }

    // Run deterministic checks
    const checks = runDeterministicChecks(scrapedData);
    const score = calculateScore(checks);

    // Handle AI analysis
    let aiInsights: AIInsights | null = null;
    const enableAI = process.env.NEXT_PUBLIC_ENABLE_AI_REPORT !== "false";
    let includeAIReport = body.includeAI && enableAI;

    if (includeAIReport && !checkAIRateLimit(url)) {
      includeAIReport = false;
    }

    const aiPromise = includeAIReport
      ? getAIInsightsWithBudget(scrapedData)
      : Promise.resolve(null);

    const pagespeedPromise = process.env.GOOGLE_PAGESPEED_API_KEY
      ? getPageSpeedScore(url)
          .then((psResult) => psResult.score !== null ? { score: psResult.score } : null)
          .catch((err) => {
            console.error(
              "PageSpeed fetch failed:",
              err instanceof Error ? err.message : "Unknown error"
            );
            return null;
          })
      : Promise.resolve(null);

    const [aiResult, pagespeedResult] = await Promise.allSettled([aiPromise, pagespeedPromise]);

    aiInsights = aiResult.status === "fulfilled" ? aiResult.value : null;
    const pagespeed = pagespeedResult.status === "fulfilled" ? pagespeedResult.value : null;

    // Build response
    const h1 = scrapedData.headings.find((h) => h.startsWith("H1:"))?.replace(/^H1:\s*/, "") ?? "";
    const result: ScanResult = {
      url,
      score,
      checks,
      aiInsights,
      pagespeed,
      metadata: {
        title: scrapedData.title,
        metaDescription: scrapedData.metaDescription,
        ogTitle: scrapedData.ogTitle,
        ogDescription: scrapedData.ogDescription,
        ogImage: scrapedData.ogImage,
        canonical: scrapedData.canonical,
        h1,
      },
      scannedAt: new Date().toISOString(),
    };

    return NextResponse.json(await saveReportRecord(result, authContext.user?.id), { status: 200 });
  } catch (err: unknown) {
    console.error("Scan route error:", err);
    return errorResponse(
      "An unexpected error occurred. Please try again.",
      500
    );
  }
}
