import { NextRequest, NextResponse } from "next/server";
import { normalizeUrl, validateUrl } from "@/lib/scrape";
import { buildAIPrompt } from "@/lib/build-ai-prompt";
import { generateAIInsights } from "@/lib/ai-provider";
import { runScanCore } from "@/lib/scan-core";
import { saveReportRecord } from "@/lib/report-db";
import { getAuthContext } from "@/lib/auth-server";
import { checkUsageLimit, getClientKey, getPlanLimit, incrementUsage } from "@/lib/usage-limits";
import { isMasterAdmin } from "@/lib/admin";
import { ScrapedData, ScanResult, AIInsights, CompetitorScanResult, SchemaRecommendation } from "@/types/index";

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
  // Detected schema must come only from the deterministic HTML scraper.
  const detected = Array.from(new Set(fallbackDetected.filter((s): s is string => typeof s === "string" && s.trim().length > 0)));
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

type DeterministicFacts = {
  detectedSchemaTypes: string[];
  hasFAQPageSchema: boolean;
  hasOrganizationSchema: boolean;
  hasWebSiteSchema: boolean;
  hasWebPageSchema: boolean;
  hasFAQContent: boolean;
  aboutPageFound: boolean;
  contactPageFound: boolean;
  aboutContactDetail: string;
};

function hasFaqLikeContent(scrapedData: ScrapedData): boolean {
  const headingText = scrapedData.headings.map((h) => h.replace(/^H\d+:\s*/, "")).join(" ");
  return /\?|faq|question|how to|what is|why |when /i.test(headingText) ||
    /faq|frequently asked/i.test(scrapedData.bodyText.slice(0, 2000));
}

function getDeterministicFacts(scrapedData: ScrapedData, checks: ScanResult["checks"]): DeterministicFacts {
  const detectedSchemaTypes = Array.from(new Set(scrapedData.schemaTypes));
  const hasSchema = (type: string) => detectedSchemaTypes.some((value) => normalizeSchemaType(value) === normalizeSchemaType(type));
  const aboutContactDetail =
    checks.find((check) => check.id === "eeat_about")?.detail ||
    (scrapedData.hasAboutPage && scrapedData.hasContactPage
      ? "About and Contact pages linked - strong trust signals"
      : scrapedData.hasContactPage
        ? "Contact page found but no About page linked"
        : scrapedData.hasAboutPage
          ? "About page found but no Contact page linked"
          : "No About or Contact page linked - add both for E-E-A-T");

  return {
    detectedSchemaTypes,
    hasFAQPageSchema: hasSchema("FAQPage"),
    hasOrganizationSchema: hasSchema("Organization"),
    hasWebSiteSchema: hasSchema("WebSite"),
    hasWebPageSchema: hasSchema("WebPage"),
    hasFAQContent: hasFaqLikeContent(scrapedData),
    aboutPageFound: Boolean(scrapedData.hasAboutPage),
    contactPageFound: Boolean(scrapedData.hasContactPage),
    aboutContactDetail,
  };
}

function detailToSnapshotPhrase(detail: string): string {
  if (/about and contact pages linked/i.test(detail)) return "About and Contact pages are linked.";
  if (/contact page found.*no.*about page linked/i.test(detail)) return "Contact page found, but no dedicated About page linked.";
  if (/about page found.*no.*contact page linked/i.test(detail)) return "About page found, but no dedicated Contact page linked.";
  if (/no about or contact page linked/i.test(detail)) return "No dedicated About or Contact page linked.";
  return detail;
}

function appearsToContradictAboutContact(text: string, facts: DeterministicFacts): boolean {
  const lower = text.toLowerCase();
  const mentionsContactMissing = /(no|missing|without|lack|lacks|absent).{0,35}contact|contact.{0,35}(missing|not found|absent|lacking)/i.test(lower);
  const mentionsAboutMissing = /(no|missing|without|lack|lacks|absent).{0,35}about|about.{0,35}(missing|not found|absent|lacking)/i.test(lower);
  if (facts.contactPageFound && mentionsContactMissing) return true;
  if (facts.aboutPageFound && mentionsAboutMissing) return true;
  return false;
}

function groundAIInsights(aiInsights: AIInsights | null, facts: DeterministicFacts): AIInsights | null {
  if (!aiInsights) return null;

  const groundedSchema = parseSchemaRecommendations(
    {
      schemaRecommendations: {
        detected: facts.detectedSchemaTypes,
        missing: aiInsights.schemaRecommendations?.missing ?? [],
        priority: aiInsights.schemaRecommendations?.priority ?? "",
        reasoning: aiInsights.schemaRecommendations?.reasoning ?? "",
      },
    },
    facts.detectedSchemaTypes
  );

  const deterministicAboutContact = detailToSnapshotPhrase(facts.aboutContactDetail);
  const currentGap = aiInsights.contentGap?.trim() || "";
  const shouldForceAboutContactGap =
    /contact page found.*no.*about page linked/i.test(facts.aboutContactDetail) ||
    /about page found.*no.*contact page linked/i.test(facts.aboutContactDetail) ||
    /no about or contact page linked/i.test(facts.aboutContactDetail);
  const groundedGap = shouldForceAboutContactGap
    ? deterministicAboutContact
    : appearsToContradictAboutContact(currentGap, facts)
      ? deterministicAboutContact
      : currentGap;

  const currentSummary = aiInsights.summary?.trim() || "";
  const groundedSummary = appearsToContradictAboutContact(currentSummary, facts)
    ? `${currentSummary ? `${currentSummary.replace(/\s+$/, "")} ` : ""}${deterministicAboutContact}`.trim()
    : currentSummary;

  return {
    ...aiInsights,
    summary: groundedSummary || aiInsights.summary,
    contentGap: groundedGap || aiInsights.contentGap,
    schemaRecommendations: groundedSchema,
  };
}

async function getAIInsightsWithBudget(
  scrapedData: ScrapedData,
  context?: {
    overallScore: number;
    detectedSchemas: string[];
    missingSchemas: string[];
    passingChecks: string[];
    scores: {
      metadata?: number;
      schema?: number;
      headings?: number;
      trustSignals?: number;
    };
    issues: string[];
    deterministicFacts?: DeterministicFacts;
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
      "Add or expand structured data relevant to your page type.",
    ],
    quickWin: "Improve the clearest missing AI visibility signal first.",
    contentGap: "The page needs more explicit, answer-ready content that maps brand, category, audience, use cases, and proof.",
    summary: cleaned.slice(0, 500) || "AI analysis completed, but the provider returned an empty response.",
    schemaRecommendations: parseSchemaRecommendations({}, fallbackDetected),
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    const core = await runScanCore(normalizedUrl, {
      includePageSpeed: false,
      normalizeAndValidate: false,
    });

    return {
      url: normalizedUrl,
      score: core.score,
      checks: core.checks,
      categoryScores: core.categoryScores,
      metadata: core.metadata,
      pagespeed: null,
      summary: core.checks.find((check) => check.status !== "pass")?.detail ?? "Core visibility signals are in good shape.",
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
  const usageKey = authContext.user ? `user:${authContext.user.id}` : getClientKey(body.clientId, req);
  const usage = await checkUsageLimit(usageKey, getPlanLimit(effectivePlan));
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
        let coreResult;
        try {
          coreResult = await runScanCore(url, {
            includePageSpeed: true,
            normalizeAndValidate: false,
            onProgress: (phase) => {
              if (phase === "fetch_started") emitProgress(2, "Fetching website", "started");
              if (phase === "fetch_complete") emitProgress(2, "Fetching website", "complete");
              if (phase === "parse_complete") {
                emitProgress(3, "Reading metadata and schema", "started");
                emitProgress(3, "Reading metadata and schema", "complete");
              }
              if (phase === "pagespeed_started") emitProgress(4, "Running PageSpeed check", "started");
              if (phase === "pagespeed_complete") emitProgress(4, "Running PageSpeed check", "complete");
            },
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Could not scan this website.";
          emitError(message);
          controller.close();
          return;
        }

        const scrapedData: ScrapedData = coreResult.scrapedData;
        const checks = coreResult.checks;
        const score = coreResult.score;
        const pagespeed = coreResult.pagespeed;
        const categoryScores = coreResult.categoryScores;
        if (!pagespeed) {
          const psError = coreResult.pagespeedResult?.error ?? "";
          const isConfigIssue = psError.toLowerCase().includes("no google pagespeed api key configured");
          emitProgress(4, "PageSpeed unavailable, continuing", isConfigIssue ? "skipped" : "error");
        }

        const detectedSchemas = scrapedData.schemaTypes;
        const deterministicFacts = getDeterministicFacts(scrapedData, checks);
        const candidateSchemaTypes = ["Organization", "WebSite", "WebPage", "FAQPage", "Article", "HowTo", "BreadcrumbList", "Service", "Product", "SoftwareApplication"];
        const missingSchemas = candidateSchemaTypes.filter(
          (type) => !detectedSchemas.some((detected) => detected.toLowerCase() === type.toLowerCase())
        );
        const issueTitles = checks
          .filter((check) => check.status !== "pass")
          .map((check) => check.label);
        const passingCheckLabels = checks
          .filter((check) => check.status === "pass")
          .map((check) => check.label);

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
              passingChecks: passingCheckLabels,
              scores: {
                metadata: categoryScores.metadata,
                schema: categoryScores.schema,
                headings: categoryScores.headings,
                trustSignals: categoryScores.trustSignals,
              },
              issues: issueTitles,
              deterministicFacts,
            });
            if (aiInsights) {
              aiInsights = groundAIInsights(aiInsights, deterministicFacts);
              emitProgress(5, "Generating AI insights", "complete");
            } else {
              emitProgress(5, "Using local recommendations", "skipped");
            }
          } catch (err: unknown) {
            console.error("AI insights failed:", err instanceof Error ? err.message : "Unknown error");
            emitProgress(5, "Using local recommendations", "error");
          }
        }
        aiInsights = groundAIInsights(aiInsights, deterministicFacts);

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
          metadata: coreResult.metadata,
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

