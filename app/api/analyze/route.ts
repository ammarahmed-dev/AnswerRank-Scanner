import { NextRequest, NextResponse } from "next/server";
import { normalizeUrl, validateUrl, fetchHtml, parseHtml } from "@/lib/scrape";
import { calculateScores, getFallbackAnalysis } from "@/lib/score";
import { getPageSpeedScore } from "@/lib/pagespeed";
import { analyzeWithAI } from "@/lib/openai";
import { getAuthContext } from "@/lib/auth-server";
import { AnalysisReport } from "@/types/report";

function errorResponse(error: string, status: number, details?: string) {
  return NextResponse.json({ error, details }, { status });
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req);
  if (!auth.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { url?: string };
    const rawUrl = body?.url;
    if (!rawUrl || typeof rawUrl !== "string") {
      return errorResponse("Please provide a valid URL.", 400);
    }

    let normalizedUrl = "";
    try {
      normalizedUrl = normalizeUrl(rawUrl);
    } catch {
      return errorResponse("Invalid URL. Enter a public website URL like https://example.com.", 400);
    }

    if (!validateUrl(normalizedUrl)) {
      return errorResponse("Invalid URL. Only public http(s) URLs are supported.", 400);
    }

    let html = "";
    try {
      html = await fetchHtml(normalizedUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.toLowerCase().includes("timeout") || message.toLowerCase().includes("aborted")) {
        return errorResponse("Request timed out while fetching this URL.", 408);
      }
      if (message.toLowerCase().includes("blocked")) {
        return errorResponse("This website blocked the scanner. Try a public marketing page or a different URL.", 422, message);
      }
      return errorResponse("Could not fetch this website. It may block bots or be unavailable.", 422, message);
    }

    if (!html.trim()) {
      return errorResponse("Website returned empty HTML. Try another page URL.", 422);
    }

    const extractedData = parseHtml(html, normalizedUrl);
    if (!extractedData.bodyText && !extractedData.pageTitle && !extractedData.metaDescription) {
      return errorResponse("Could not extract meaningful content from this page.", 422);
    }

    const pageSpeedResult = await getPageSpeedScore(normalizedUrl);
    const pageSpeedScore = pageSpeedResult.score;
    const scores = calculateScores(extractedData, pageSpeedScore);

    let aiAnalysis;
    let aiProvider: AnalysisReport["integrations"]["aiProvider"] = "fallback";
    const integrationNotes: string[] = [];

    try {
      if (process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY) {
        const aiResult = await analyzeWithAI(extractedData);
        aiAnalysis = aiResult.analysis;
        aiProvider = aiResult.provider;
        if (process.env.OPENAI_API_KEY && process.env.GEMINI_API_KEY && aiProvider === "gemini") {
          integrationNotes.push("OpenAI was configured but did not complete successfully, so Gemini was used as the AI fallback provider.");
        }
      } else {
        aiAnalysis = getFallbackAnalysis(extractedData, scores);
        integrationNotes.push("No AI API key configured, so deterministic fallback recommendations were used.");
      }
    } catch (err: unknown) {
      aiAnalysis = getFallbackAnalysis(extractedData, scores);
      aiProvider = "fallback";
      const message = err instanceof Error ? err.message : "Unknown AI provider error";
      integrationNotes.push(`AI provider failed, so deterministic fallback recommendations were used. ${message}`);
    }

    if (pageSpeedScore === null) {
      integrationNotes.push(
        `${pageSpeedResult.error ?? "Google PageSpeed did not return a score."} Performance used fallback heuristics.`
      );
    }

    const report: AnalysisReport = {
      url: normalizedUrl,
      extractedData,
      scores,
      aiAnalysis,
      pageSpeedScore,
      integrations: {
        aiProvider,
        aiPowered: aiProvider !== "fallback",
        pageSpeedProvider: pageSpeedScore === null ? "fallback" : "google",
        pageSpeedMeasured: pageSpeedScore !== null,
        notes: integrationNotes,
      },
      analysisTimestamp: new Date().toISOString()
    };
    return NextResponse.json(report, { status: 200 });
  } catch (err: unknown) {
    console.error("Analyze route error:", err);
    return errorResponse("An unexpected error occurred. Please try again.", 500);
  }
}

