import { NextRequest, NextResponse } from "next/server";
import { normalizeUrl, validateUrl, fetchHtml, parseHtml } from "@/lib/scrape";
import { calculateScores, getFallbackAnalysis } from "@/lib/score";
import { getPageSpeedScore } from "@/lib/pagespeed";
import { analyzeWithAI } from "@/lib/openai";
import { AnalysisReport } from "@/types/report";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { url?: string };
    const rawUrl = body?.url;

    if (!rawUrl || typeof rawUrl !== "string") {
      return NextResponse.json(
        { error: "Please provide a valid URL." },
        { status: 400 }
      );
    }

    const normalizedUrl = normalizeUrl(rawUrl);

    if (!validateUrl(normalizedUrl)) {
      return NextResponse.json(
        { error: "Invalid URL. Only http:// and https:// URLs are supported." },
        { status: 400 }
      );
    }

    // Fetch HTML
    let html: string;
    try {
      html = await fetchHtml(normalizedUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("aborted")) {
        return NextResponse.json(
          { error: "Request timed out. The website took too long to respond." },
          { status: 408 }
        );
      }
      return NextResponse.json(
        {
          error: "Could not fetch the website. It may be blocking crawlers or unavailable.",
          details: message,
        },
        { status: 422 }
      );
    }

    // Parse HTML
    const extractedData = parseHtml(html, normalizedUrl);

    // PageSpeed (optional)
    const pageSpeedScore = await getPageSpeedScore(normalizedUrl);

    // Calculate scores
    const scores = calculateScores(extractedData, pageSpeedScore);

    // AI analysis (optional)
    let aiAnalysis;
    if (process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY) {
      try {
        aiAnalysis = await analyzeWithAI(extractedData);
      } catch (err) {
        console.error("OpenAI error:", err);
        aiAnalysis = getFallbackAnalysis(extractedData, scores);
      }
    } else {
      aiAnalysis = getFallbackAnalysis(extractedData, scores);
    }

    const report: AnalysisReport = {
      url: normalizedUrl,
      extractedData,
      scores,
      aiAnalysis,
      pageSpeedScore,
      analysisTimestamp: new Date().toISOString(),
    };

    return NextResponse.json(report, { status: 200 });
  } catch (err: unknown) {
    console.error("Analyze route error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
