import { readBoundedText } from "@/lib/bounded-body";

/**
 * AI Visibility Tracker: asks AI answer engines buyer-style questions and records whether a brand
 * is mentioned in the answer and whether its domain is cited as a source.
 * See docs/RESEARCH.md ("Spec: AI Visibility Tracker").
 */

export type EngineName = "perplexity" | "gemini";

export type Brand = { name: string; domain: string };

export type EngineAnswer = { answer: string; citations: string[]; requestedModel?: string };

export type CitationEvidence = {
  sourceUrl: string;
  state: "resolved" | "unverified";
  finalUrl?: string;
  httpStatus?: number;
  reason?: "request_failed" | "deadline" | "budget" | "http_error" | "not_checked";
};

export const VISIBILITY_METHOD = "visibility-2026-10-v3";

export type PromptResult = {
  prompt: string;
  engine: EngineName;
  mentioned: boolean;
  cited: boolean;
  /** 1-based position of the brand among list items in the answer, when the answer is a list. */
  position: number | null;
  citations: string[];
  answer?: string;
  requestedModel?: string;
  recordedAt?: string;
  citationVerified?: boolean;
  citationEvidence?: CitationEvidence[];
  promptKind?: "branded" | "unbranded";
  methodologyVersion?: string;
  error?: string;
};

export type VisibilitySummary = {
  results: PromptResult[];
  mentionRate: number;
  citationRate: number;
  checked: number;
  citationChecked?: number;
  brandedChecked?: number;
  unbrandedChecked?: number;
};

const ENGINE_TIMEOUT_MS = 30_000;

async function fetchJson(url: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(ENGINE_TIMEOUT_MS) });
  if (!res.ok) {
    await res.body?.cancel().catch(() => undefined);
    throw new Error(`HTTP ${res.status}`);
  }
  return JSON.parse(await readBoundedText(res, 1_000_000));
}

export async function askPerplexity(prompt: string, apiKey: string): Promise<EngineAnswer> {
  const requestedModel = process.env.PERPLEXITY_MODEL || "sonar";
  const data = (await fetchJson("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: requestedModel,
      messages: [{ role: "user", content: prompt }],
    }),
  })) as {
    choices?: Array<{ message?: { content?: string } }>;
    citations?: string[];
    search_results?: Array<{ url?: string }>;
  };
  const citations = data.citations?.length
    ? data.citations
    : (data.search_results ?? []).map((r) => r.url).filter((u): u is string => Boolean(u));
  return { answer: data.choices?.[0]?.message?.content ?? "", citations, requestedModel };
}

export async function askGemini(prompt: string, apiKey: string): Promise<EngineAnswer> {
  const model = process.env.GEMINI_VISIBILITY_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const data = (await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }),
    }
  )) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> };
    }>;
  };
  const candidate = data.candidates?.[0];
  const answer = (candidate?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  // Preserve source URIs. Titles are display labels and cannot verify a citation URL.
  const citations = (candidate?.groundingMetadata?.groundingChunks ?? [])
    .map((chunk) => chunk.web?.uri || "")
    .filter(Boolean);
  return { answer, citations, requestedModel: model };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeDomain(input: string): string {
  const trimmed = input.trim().toLowerCase();
  try {
    return new URL(/^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`).hostname.replace(/^www\./, "");
  } catch {
    return trimmed.replace(/^www\./, "");
  }
}

function mentionPattern(brand: Brand): RegExp {
  const domain = normalizeDomain(brand.domain);
  const terms = [brand.name.trim(), domain].filter(Boolean).map(escapeRegExp);
  return new RegExp(`(^|[^a-z0-9])(${terms.join("|")})([^a-z0-9]|$)`, "i");
}

/** Whether the brand appears in the answer, is cited, and where it ranks in a list answer. */
export function analyzeAnswer(answer: string, citations: string[], brand: Brand) {
  const pattern = mentionPattern(brand);
  const domain = normalizeDomain(brand.domain);
  const mentioned = pattern.test(answer);
  const cited = citations.some((c) => {
    const host = normalizeDomain(c);
    return host === domain || host.endsWith(`.${domain}`);
  });

  const listItems = answer.split(/\r?\n/).filter((line) => /^\s*(\d+[.)]|[-*•])\s+/.test(line));
  const index = listItems.findIndex((line) => pattern.test(line));
  return { mentioned, cited, position: index >= 0 ? index + 1 : null };
}

/** Starter buyer prompts derived from the scanned page; users can edit them. */
export function suggestPrompts(input: { title?: string; h1?: string; description?: string; brandName: string }): string[] {
  const source = (input.h1 || input.title || "").replace(new RegExp(escapeRegExp(input.brandName), "ig"), "");
  const topic = source.split(/[|\-:–]/).map((s) => s.trim()).find((s) => s.length >= 4) || "this category";
  return [
    `What are the best ${topic} options?`,
    `Which ${topic} tools do experts recommend?`,
    `What is the best alternative for ${topic}?`,
    `Who are the leading companies for ${topic}?`,
    `Is ${input.brandName} a good choice for ${topic}?`,
  ];
}

export function availableEngines(): Array<{ name: EngineName; ask: (prompt: string) => Promise<EngineAnswer> }> {
  const engines: Array<{ name: EngineName; ask: (prompt: string) => Promise<EngineAnswer> }> = [];
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (perplexityKey) engines.push({ name: "perplexity", ask: (p) => askPerplexity(p, perplexityKey) });
  if (geminiKey) engines.push({ name: "gemini", ask: (p) => askGemini(p, geminiKey) });
  return engines;
}

export async function runVisibilityCheck(
  brand: Brand,
  prompts: string[],
  engines: Array<{ name: EngineName; ask: (prompt: string) => Promise<EngineAnswer> }>,
  verifyCitations?: (urls: string[]) => Promise<CitationEvidence[]>
): Promise<VisibilitySummary> {
  const tasks = prompts.flatMap((prompt) => engines.map((engine) => ({ prompt, engine })));
  const results = await Promise.all(
    tasks.map(async ({ prompt, engine }): Promise<PromptResult> => {
      try {
        const { answer, citations, requestedModel } = await engine.ask(prompt);
        if (typeof answer !== "string" || !answer.trim() || answer.length > 50_000 || !Array.isArray(citations)) {
          throw new Error("Engine returned an invalid or empty answer");
        }
        const sourceUrls: string[] = [];
        for (const source of citations) {
          if (typeof source !== "string" || source.length > 4096) throw new Error("Engine returned an invalid source URL");
          let parsed: URL;
          try { parsed = new URL(source); } catch { throw new Error("Engine returned an invalid source URL"); }
          if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Engine returned an invalid source URL");
          sourceUrls.push(source);
        }
        if (sourceUrls.length > 100) throw new Error("Engine returned too many source URLs");
        const analysis = analyzeAnswer(answer, sourceUrls, brand);
        return {
          prompt, engine: engine.name, ...analysis, citations: sourceUrls.slice(0, 100),
          answer, requestedModel, recordedAt: new Date().toISOString(),
          citationVerified: false,
          promptKind: mentionPattern(brand).test(prompt) ? "branded" : "unbranded",
          methodologyVersion: VISIBILITY_METHOD,
        };
      } catch (err) {
        return {
          prompt,
          engine: engine.name,
          mentioned: false,
          cited: false,
          position: null,
          citations: [],
          error: err instanceof Error ? err.message : "Engine request failed",
        };
      }
    })
  );
  // One bounded destination pass across the run; engine source labels alone are not verification.
  const urls = [...new Set(results.filter(r => !r.error).flatMap(r => r.citations))];
  let evidence: CitationEvidence[] = [];
  try { evidence = await verifyCitations?.(urls) ?? []; } catch { /* Keep usable answers, mark sources unknown. */ }
  const bySource = new Map(evidence.map(item => [item.sourceUrl, item]));
  for (const result of results) {
    if (result.error) continue;
    result.citationEvidence = result.citations.map(sourceUrl => bySource.get(sourceUrl) ?? { sourceUrl, state: "unverified", reason: "not_checked" });
    const destinations = result.citationEvidence.filter(item => item.state === "resolved" && item.finalUrl).map(item => item.finalUrl!);
    result.cited = analyzeAnswer(result.answer ?? "", destinations, brand).cited;
    // A verified positive is useful even if another source is unknown. A negative needs all sources checked.
    result.citationVerified = result.cited || result.citationEvidence.every(item => item.state === "resolved");
  }
  const ok = results.filter((r) => !r.error);
  const citationResults = ok.filter(r => r.citationVerified !== false);
  const rate = (n: number, denominator = ok.length) => (denominator ? Math.round((n / denominator) * 100) : 0);
  return {
    results,
    mentionRate: rate(ok.filter((r) => r.mentioned).length),
    citationRate: rate(citationResults.filter((r) => r.cited).length, citationResults.length),
    citationChecked: citationResults.length,
    brandedChecked: ok.filter(r => r.promptKind === "branded").length,
    unbrandedChecked: ok.filter(r => r.promptKind === "unbranded").length,
    checked: ok.length,
  };
}
