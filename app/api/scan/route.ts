import { NextRequest, NextResponse } from "next/server";
import { normalizeUrl, validateUrl } from "@/lib/scrape";
import { buildAIPrompt } from "@/lib/build-ai-prompt";
import { generateAIInsights } from "@/lib/ai-provider";
import { runScanCore } from "@/lib/scan-core";
import { saveReportRecord } from "@/lib/report-db";
import { getAuthContext } from "@/lib/auth-server";
import { commitUsage, getClientKey, getPlanLimit, releaseUsage, reserveUsage, type UsageReservation } from "@/lib/usage-limits";
import { assertPublicUrl } from "@/lib/url-safety";
import { isMasterAdmin } from "@/lib/admin";
import { reportForViewer } from "@/lib/report-access";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";
import { ScrapedData, ScanResult, AIInsights, CompetitorScanResult, SchemaRecommendation } from "@/types/index";

export const runtime = "nodejs";

const aiCallCache = new Map<string, number>();
const AI_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const AI_CACHE_MAX_SIZE = 500;
let didLogDevScanLimitBypass = false;

function checkAIRateLimit(url: string): boolean {
  const lastCall = aiCallCache.get(url);
  const now = Date.now();

  if (!lastCall || now - lastCall > AI_COOLDOWN_MS) {
    if (aiCallCache.size >= AI_CACHE_MAX_SIZE) {
      // FIFO eviction: remove the oldest entry
      const oldestKey = aiCallCache.keys().next().value;
      if (oldestKey !== undefined) aiCallCache.delete(oldestKey);
    }
    aiCallCache.set(url, now);
    return true;
  }
  return false;
}

function isDevScanLimitBypassEnabled(): boolean {
  const enabled = process.env.AEO_DEV_BYPASS_SCAN_LIMIT === "true";
  const isDev = process.env.NODE_ENV !== "production";
  const active = enabled && isDev;

  if (active && !didLogDevScanLimitBypass) {
    console.warn("[scan] Dev bypass active: scan usage limits are disabled for local verification.");
    didLogDevScanLimitBypass = true;
  }

  return active;
}

function errorResponse(error: string, status: number, details?: string) {
  return NextResponse.json({ error, details }, { status });
}

function normalizeSchemaType(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pageLooksEditorial(scrapedData: ScrapedData): boolean {
  const url = (scrapedData.url ?? "").toLowerCase();
  const title = (scrapedData.title ?? "").toLowerCase();
  const description = (scrapedData.metaDescription ?? "").toLowerCase();
  const body = (scrapedData.bodyText ?? "").toLowerCase();
  const headingText = scrapedData.headings.map((h) => h.replace(/^H\d+:\s*/, "")).join(" ").toLowerCase();

  const hasEditorialPath = /\/(blog|news|article|articles|post|posts)(\/|$)/.test(url);
  const hasEditorialKeyword = /\b(blog|article|news|editorial)\b/.test(`${title} ${description}`);
  const hasBylineOrDate = Boolean(scrapedData.hasAuthor || scrapedData.hasPersonSchema || scrapedData.datePublished || scrapedData.dateModified);
  const hasLongFormStructure = (scrapedData.wordCount ?? 0) >= 450 && scrapedData.headings.filter((h) => h.startsWith("H2:")).length >= 3;
  const hasEditorialBodySignals = /\bby\s+[a-z]+|\bpublished\b|\bupdated\b/.test(`${headingText} ${body.slice(0, 2200)}`);

  return hasEditorialPath || (hasEditorialKeyword && hasBylineOrDate && hasLongFormStructure) || (hasBylineOrDate && hasEditorialBodySignals && hasLongFormStructure);
}

function parseSchemaRecommendations(
  parsed: Record<string, unknown>,
  fallbackDetected: string[],
  options?: { allowArticleRecommendation?: boolean }
): SchemaRecommendation {
  const sr = parsed.schemaRecommendations as Record<string, unknown> | undefined;
  // Detected schema must come only from the deterministic HTML scraper.
  const detected = Array.from(new Set(fallbackDetected.filter((s): s is string => typeof s === "string" && s.trim().length > 0)));
  const detectedSet = new Set(detected.map(normalizeSchemaType));

  const missingRaw = Array.isArray(sr?.missing)
    ? (sr.missing as string[]).filter((s): s is string => typeof s === "string")
    : [];
  const allowArticleRecommendation = options?.allowArticleRecommendation ?? true;
  const missing = Array.from(new Set(missingRaw)).filter(
    (type) => !detectedSet.has(normalizeSchemaType(type))
  ).filter((type) => {
    if (allowArticleRecommendation) return true;
    const normalized = normalizeSchemaType(type);
    return normalized !== "article" && normalized !== "blogposting" && normalized !== "newsarticle";
  });

  const rawPriority = typeof sr?.priority === "string" ? sr.priority : "";
  const rawPriorityAllowed = allowArticleRecommendation || !["article", "blogposting", "newsarticle"].includes(normalizeSchemaType(rawPriority));
  const priority = rawPriority && !detectedSet.has(normalizeSchemaType(rawPriority)) && rawPriorityAllowed
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
  pageLooksEditorial: boolean;
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
    pageLooksEditorial: pageLooksEditorial(scrapedData),
    aboutPageFound: Boolean(scrapedData.hasAboutPage),
    contactPageFound: Boolean(scrapedData.hasContactPage),
    aboutContactDetail,
  };
}

function detailToSnapshotPhrase(detail: string): string {
  if (/about and contact pages linked/i.test(detail)) return "About and Contact pages are linked.";
  if (/contact page found.*no.*about page linked/i.test(detail)) return "Contact page found, but no dedicated About page linked.";
  if (/about page found.*no.*contact page linked/i.test(detail)) return "About page found, but no dedicated Contact page linked.";
  if (/no (dedicated )?about or contact page linked/i.test(detail)) return "No clearly linked About or Contact page found.";
  if (/no clearly linked about or contact page found/i.test(detail)) return "No clearly linked About or Contact page found.";
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
    facts.detectedSchemaTypes,
    { allowArticleRecommendation: facts.pageLooksEditorial }
  );

  const deterministicAboutContact = detailToSnapshotPhrase(facts.aboutContactDetail);
  const currentGap = aiInsights.contentGap?.trim() || "";
  const shouldForceAboutContactGap =
    /contact page found.*no.*about page linked/i.test(facts.aboutContactDetail) ||
    /about page found.*no.*contact page linked/i.test(facts.aboutContactDetail) ||
    /no about or contact page linked/i.test(facts.aboutContactDetail) ||
    /no clearly linked about or contact page found/i.test(facts.aboutContactDetail);
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

const supabaseUrl = getSupabaseServerUrl();

async function patchOnetimeProfile(userId: string, fields: Record<string, unknown>) {
  await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH",
    headers: {
      ...getSupabaseServiceHeaders(),
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(fields),
  }).catch((err) => console.error("[scan] onetime profile patch failed:", err));
}

async function scanCompetitor(rawUrl: string): Promise<CompetitorScanResult> {
  let normalizedUrl = rawUrl;
  try {
    normalizedUrl = normalizeUrl(rawUrl);
    if (!validateUrl(normalizedUrl)) throw new Error("Invalid competitor URL");
    await assertPublicUrl(normalizedUrl);
  } catch {
    return { url: rawUrl, error: "Could not scan competitor URL" };
  }

  const timeoutMs = Number(process.env.COMPETITOR_SCAN_TIMEOUT_MS ?? 25000);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Competitor scan timed out")), timeoutMs);
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
  } finally {
    clearTimeout(timer);
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

  try {
    await assertPublicUrl(url);
  } catch (e) {
    return errorResponse((e as Error).message, 400);
  }

  const authContext = await getAuthContext(req);
  const isAdmin = authContext.user ? isMasterAdmin(authContext.user.email) : false;
  const effectivePlan = isAdmin ? "agency" : authContext.plan;
  const usageKey = authContext.user ? `user:${authContext.user.id}` : getClientKey(body.clientId, req);
  const bypassScanLimit = isAdmin || isDevScanLimitBypassEnabled();
  // Reserved atomically up front; committed on success and released on any failure below.
  const usage: UsageReservation = bypassScanLimit
    ? { allowed: true, count: 0, remaining: Number.MAX_SAFE_INTEGER, limit: Number.MAX_SAFE_INTEGER, reserved: false, usageDate: "" }
    : await reserveUsage(usageKey, getPlanLimit(effectivePlan));
  if (usage && !usage.allowed) {
    return NextResponse.json(
      {
        type: "limit_reached",
        error: `You've used your ${usage.limit} scan${usage.limit === 1 ? "" : "s"} for this month.`,
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
        headers: getSupabaseServiceHeaders(),
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
  // Full report only for paid plans (pro/agency/admin), onetime users on their locked URL,
  // or a retest of a report that was already unlocked. Guests and free users get the preview.
  let isFullReport = isAdmin || effectivePlan === "pro" || effectivePlan === "agency" || Boolean(retestSeed?.unlocked);
  let onetimeLockMessage: string | undefined;

  if (effectivePlan === "onetime" && !isAdmin) {
    const storedUrl = authContext.onetimeUrl ?? null;
    const scanCount = authContext.onetimeScanCount ?? 0;

    if (storedUrl === null) {
      // First scan: will lock this URL
      isFullReport = true;
    } else if (storedUrl === url) {
      // Matches locked URL: allow up to 4 total scans (1 initial + 3 retests)
      if (scanCount >= 4) {
        isFullReport = false;
        onetimeLockMessage = "You've used all 3 retests for your full report. Upgrade to Pro for unlimited rescans.";
      } else {
        isFullReport = true;
      }
    } else {
      // Different URL: free preview only
      isFullReport = false;
      onetimeLockMessage = `Your full report is locked to ${storedUrl}. Upgrade to Pro to scan unlimited sites.`;
    }
  }

  const encoder = new TextEncoder();
  let usageSettled = false;

  const stream = new ReadableStream({
    cancel() {
      console.info("[scan] SSE client disconnected before stream completed");
    },
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
          const raw = err instanceof Error ? err.message : "";
          const isInternal = /scrape:|jina|http [45]\d\d|fetch failed|econnrefused|timeout|aborted|reader returned/i.test(raw);
          const message = isInternal || !raw
            ? "We couldn't scan this URL. The site may be blocking automated access. Try a different URL or check that the address is correct."
            : raw;
          await releaseUsage(usageKey, usage);
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
        const candidateSchemaTypes = [
          "Organization",
          "WebSite",
          "WebPage",
          "FAQPage",
          ...(deterministicFacts.pageLooksEditorial ? ["Article"] : []),
          "HowTo",
          "BreadcrumbList",
          "Service",
          "Product",
          "SoftwareApplication",
        ];
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
          const label = competitorUrls.length === 1 ? "Scanning competitor" : "Scanning competitors";
          emitProgress(6, label, "started");
          competitors = await Promise.all(competitorUrls.map(scanCompetitor));
        }

        emitProgress(6, "Preparing report", "started");
        const result: ScanResult = {
          url,
          score,
          checks,
          categoryScores,
          aiInsights,
          pagespeed,
          schemaTypes: deterministicFacts.detectedSchemaTypes,
          metadata: coreResult.metadata,
          competitorUrls: competitorUrls.length ? competitorUrls : undefined,
          competitors,
          scannedAt: new Date().toISOString(),
          unlocked: Boolean(retestSeed?.unlocked),
          retest_count: retestSeed?.retestCount ?? 0,
          max_retests: retestSeed?.maxRetests ?? 3,
          isFullReport,
          onetimeLockMessage,
          limitedScan: scrapedData.source === "reader" || undefined,
        };

        // Update onetime profile after successful scan
        if (effectivePlan === "onetime" && !isAdmin && isFullReport && userId) {
          if ((authContext.onetimeUrl ?? null) === null) {
            await patchOnetimeProfile(userId, { onetime_url: url, onetime_scan_count: 1 });
          } else {
            await patchOnetimeProfile(userId, {
              onetime_scan_count: (authContext.onetimeScanCount ?? 0) + 1,
            });
          }
        }

        const savedResult = await saveReportRecord(result, userId);
        if (!bypassScanLimit) {
          await commitUsage(usageKey, usage);
        }
        usageSettled = true;

        emitProgress(6, "Preparing report", "complete");
        await sleep(220);
        // The stored report stays complete; preview viewers get the paid sections removed.
        emit({ type: "result", result: reportForViewer(savedResult, { plan: effectivePlan, isAdmin, isOwner: true }) });
        controller.close();
      } catch (err: unknown) {
        console.error("Stream error:", err);
        if (!usageSettled) await releaseUsage(usageKey, usage).catch(() => undefined);
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

