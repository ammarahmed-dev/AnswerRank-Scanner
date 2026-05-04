import { NextResponse } from "next/server";
import {
  fetchHtml,
  fetchJinaReaderText,
  normalizeUrl,
  parseHtmlToScrapedData,
  parseReaderTextToScrapedData,
  validateUrl,
} from "@/lib/scrape";
import { calculateScore, runDeterministicChecks } from "@/lib/score-engine";
import type { CheckResult, ScrapedData } from "@/types/index";

export const runtime = "nodejs";

type CompareBody = { urls?: string[] };

async function scrapeUrl(url: string): Promise<ScrapedData> {
  try {
    return parseHtmlToScrapedData(await fetchHtml(url), url);
  } catch {
    const readerText = await fetchJinaReaderText(url);
    return parseReaderTextToScrapedData(readerText, url);
  }
}

function checkValue(checks: CheckResult[], id: string) {
  const status = checks.find((check) => check.id === id)?.status;
  if (status === "pass") return 100;
  if (status === "warn") return 60;
  return 20;
}

function avg(values: number[]) {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function benchmarkMetrics(checks: CheckResult[], score: number) {
  return {
    overall: score,
    entity: avg([checkValue(checks, "title"), checkValue(checks, "meta_desc"), checkValue(checks, "h1")]),
    schema: avg([checkValue(checks, "schema_present"), checkValue(checks, "faq_schema")]),
    proof: avg([checkValue(checks, "word_count"), checkValue(checks, "alt_text"), checkValue(checks, "internal_links")]),
  };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as CompareBody;
  const urls = [...new Set((body.urls ?? []).map((url) => url.trim()).filter(Boolean))].slice(0, 3);

  if (!urls.length) {
    return NextResponse.json({ error: "Add at least one competitor URL." }, { status: 400 });
  }

  const results = await Promise.all(urls.map(async (rawUrl) => {
    const url = normalizeUrl(rawUrl);
    if (!validateUrl(url)) throw new Error(`Invalid URL: ${rawUrl}`);

    const scraped = await scrapeUrl(url);
    const checks = runDeterministicChecks(scraped);
    const score = calculateScore(checks);

    return {
      url,
      score,
      metrics: benchmarkMetrics(checks, score),
    };
  }));

  return NextResponse.json({ competitors: results });
}
