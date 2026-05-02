import { NextRequest, NextResponse } from "next/server";
import { normalizeUrl, validateUrl, fetchHtml, parseHtmlToScrapedData } from "@/lib/scrape";
import { runDeterministicChecks, calculateScore } from "@/lib/score-engine";
import { buildAIPrompt } from "@/lib/build-ai-prompt";
import { generateAIInsights } from "@/lib/ai-provider";
import { getPageSpeedScore } from "@/lib/pagespeed";
import { ScanResult, AIInsights } from "@/types/index";

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

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      url?: string;
      includeAI?: boolean;
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

    // Fetch HTML
    let html = "";
    try {
      html = await fetchHtml(url);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown error";
      if (
        message.toLowerCase().includes("timeout") ||
        message.toLowerCase().includes("aborted")
      ) {
        return errorResponse(
          "Request timed out while fetching this URL.",
          408
        );
      }
      if (message.toLowerCase().includes("blocked")) {
        return errorResponse(
          "This website blocked the scanner. Try a public marketing page or a different URL.",
          422,
          message
        );
      }
      return errorResponse(
        "Could not fetch this website. It may block bots or be unavailable.",
        422,
        message
      );
    }

    if (!html.trim()) {
      return errorResponse(
        "Website returned empty HTML. Try another page URL.",
        422
      );
    }

    // Parse HTML to ScrapedData
    const scrapedData = parseHtmlToScrapedData(html, url);

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
      console.log(`AI call for ${url} within cooldown, silencing`);
      includeAIReport = false;
    }

    if (includeAIReport) {
      try {
        const prompt = buildAIPrompt(scrapedData);
        const aiRawResponse = await generateAIInsights(prompt);

        if (aiRawResponse) {
          try {
            // Try to extract JSON from response
            const jsonMatch = aiRawResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              aiInsights = {
                recommendations: Array.isArray(parsed.recommendations)
                  ? parsed.recommendations
                  : [],
                quickWin:
                  typeof parsed.quickWin === "string"
                    ? parsed.quickWin
                    : "No quick win provided",
                contentGap:
                  typeof parsed.contentGap === "string"
                    ? parsed.contentGap
                    : "No gap identified",
                summary:
                  typeof parsed.summary === "string"
                    ? parsed.summary
                    : "AI analysis complete",
              };
            }
          } catch (parseErr) {
            console.error("Failed to parse AI response:", parseErr);
            // aiInsights stays null on parse failure
          }
        }
      } catch (err: unknown) {
        console.error(
          "AI analysis failed:",
          err instanceof Error ? err.message : "Unknown error"
        );
        // Continue without AI insights
      }
    }

    // Handle PageSpeed
    let pagespeed = null;
    if (process.env.GOOGLE_PAGESPEED_API_KEY) {
      try {
        const psResult = await getPageSpeedScore(url);
        if (psResult.score !== null) {
          pagespeed = {
            score: psResult.score,
          };
        }
      } catch (err) {
        console.error(
          "PageSpeed fetch failed:",
          err instanceof Error ? err.message : "Unknown error"
        );
      }
    }

    // Build response
    const result: ScanResult = {
      url,
      score,
      checks,
      aiInsights,
      pagespeed,
      scannedAt: new Date().toISOString(),
    };

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    console.error("Scan route error:", err);
    return errorResponse(
      "An unexpected error occurred. Please try again.",
      500
    );
  }
}
