/**
 * AI Visibility Tracker: asks AI answer engines buyer-style questions and records whether a brand
 * is mentioned in the answer and whether its domain is cited as a source.
 * See docs/RESEARCH.md ("Spec: AI Visibility Tracker").
 */

export type EngineName = "perplexity" | "gemini";

export type Brand = { name: string; domain: string };

export type EngineAnswer = { answer: string; citations: string[] };

export type PromptResult = {
  prompt: string;
  engine: EngineName;
  mentioned: boolean;
  cited: boolean;
  /** 1-based position of the brand among list items in the answer, when the answer is a list. */
  position: number | null;
  citations: string[];
  error?: string;
};

export type VisibilitySummary = {
  results: PromptResult[];
  mentionRate: number;
  citationRate: number;
  checked: number;
};

const ENGINE_TIMEOUT_MS = 30_000;

async function fetchJson(url: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(ENGINE_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function askPerplexity(prompt: string, apiKey: string): Promise<EngineAnswer> {
  const data = (await fetchJson("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.PERPLEXITY_MODEL || "sonar",
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
  return { answer: data.choices?.[0]?.message?.content ?? "", citations };
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
  // Grounding URIs are redirect links; the title carries the source domain.
  const citations = (candidate?.groundingMetadata?.groundingChunks ?? [])
    .map((chunk) => chunk.web?.title || chunk.web?.uri || "")
    .filter(Boolean);
  return { answer, citations };
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
  engines: Array<{ name: EngineName; ask: (prompt: string) => Promise<EngineAnswer> }>
): Promise<VisibilitySummary> {
  const tasks = prompts.flatMap((prompt) => engines.map((engine) => ({ prompt, engine })));
  const results = await Promise.all(
    tasks.map(async ({ prompt, engine }): Promise<PromptResult> => {
      try {
        const { answer, citations } = await engine.ask(prompt);
        return { prompt, engine: engine.name, ...analyzeAnswer(answer, citations, brand), citations: citations.slice(0, 10) };
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
  const ok = results.filter((r) => !r.error);
  const rate = (n: number) => (ok.length ? Math.round((n / ok.length) * 100) : 0);
  return {
    results,
    mentionRate: rate(ok.filter((r) => r.mentioned).length),
    citationRate: rate(ok.filter((r) => r.cited).length),
    checked: ok.length,
  };
}
