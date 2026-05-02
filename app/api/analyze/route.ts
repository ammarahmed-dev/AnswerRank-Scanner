import { NextRequest, NextResponse } from "next/server";
import { normalizeUrl, validateUrl, fetchHtml, parseHtml } from "@/lib/scrape";
import { calculateScores, getFallbackAnalysis } from "@/lib/score";
import { getPageSpeedScore } from "@/lib/pagespeed";
import { analyzeWithAI } from "@/lib/openai";
import { AnalysisReport } from "@/types/report";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { url?: string };
    const rawUrl = body?.url;
    if (!rawUrl || typeof rawUrl !== "string") {
      return NextResponse.json({ error: "Please provide a valid URL." }, { status: 400 });
    }

    const normalizedUrl = normalizeUrl(rawUrl);
    if (!validateUrl(normalizedUrl)) {
      return NextResponse.json({ error: "Invalid URL. Only public http(s) URLs are supported." }, { status: 400 });
    }

    let html = "";
    try {
      html = await fetchHtml(normalizedUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.toLowerCase().includes("timeout") || message.toLowerCase().includes("aborted")) {
        return NextResponse.json({ error: "Request timed out while fetching this URL." }, { status: 408 });
      }
      return NextResponse.json({ error: "Could not fetch this website. It may block bots or be unavailable.", details: message }, { status: 422 });
    }

    if (!html.trim()) {
      return NextResponse.json({ error: "Website returned empty HTML. Try another page URL." }, { status: 422 });
    }

    const extractedData = parseHtml(html, normalizedUrl);
    if (!extractedData.bodyText && !extractedData.pageTitle && !extractedData.metaDescription) {
      return NextResponse.json({ error: "Could not extract meaningful content from this page." }, { status: 422 });
    }

    const pageSpeedScore = await getPageSpeedScore(normalizedUrl);
    const scores = calculateScores(extractedData, pageSpeedScore);

    let aiAnalysis;
    try {
      aiAnalysis = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY ? await analyzeWithAI(extractedData) : getFallbackAnalysis(extractedData, scores);
    } catch {
      aiAnalysis = getFallbackAnalysis(extractedData, scores);
    }

    const report: AnalysisReport = { url: normalizedUrl, extractedData, scores, aiAnalysis, pageSpeedScore, analysisTimestamp: new Date().toISOString() };
    return NextResponse.json(report, { status: 200 });
  } catch (err: unknown) {
    console.error("Analyze route error:", err);
    return NextResponse.json({ error: "An unexpected error occurred. Please try again." }, { status: 500 });
  }
}
