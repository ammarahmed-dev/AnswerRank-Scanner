import { AI_SYSTEM_INSTRUCTIONS, AI_EVIDENCE_MARKER } from "@/lib/build-ai-prompt";
import type { AIRecommendationProvenance } from "@/types/index";
import { readBoundedText } from "@/lib/bounded-body";

export async function generateAIInsights(prompt: string, signal?: AbortSignal, onResult?: (provenance: AIRecommendationProvenance) => void): Promise<string | null> {
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const primaryProvider = process.env.AI_PROVIDER || "deepseek";
  const allowFallbacks = process.env.AI_PROVIDER_FALLBACKS !== "false";

  // Provider order: DeepSeek primary, OpenRouter + Gemini as optional fallbacks
  let providers: Array<{ name: AIRecommendationProvenance["provider"]; key: string | undefined; call: typeof callDeepSeek }> =
    primaryProvider === "openrouter"
      ? [
          { name: "OpenRouter", key: openRouterKey, call: callOpenRouter },
          { name: "DeepSeek",   key: deepseekKey,   call: callDeepSeek },
          { name: "Gemini",     key: geminiKey,     call: callGemini },
        ]
      : primaryProvider === "gemini"
        ? [
            { name: "Gemini",     key: geminiKey,     call: callGemini },
            { name: "DeepSeek",   key: deepseekKey,   call: callDeepSeek },
            { name: "OpenRouter", key: openRouterKey, call: callOpenRouter },
          ]
        : [
            { name: "DeepSeek",   key: deepseekKey,   call: callDeepSeek },
            { name: "OpenRouter", key: openRouterKey, call: callOpenRouter },
            { name: "Gemini",     key: geminiKey,     call: callGemini },
          ];

  if (!allowFallbacks) {
    providers = providers.slice(0, 1);
  }

  for (const provider of providers) {
    signal?.throwIfAborted();
    if (!provider.key) continue;

    try {
      const result = await provider.call(prompt, provider.key, signal);
      if (result) {
        onResult?.({ kind: "provider_generated", provider: provider.name, requestedModel: result.requestedModel, responseModel: result.responseModel, generatedAt: new Date().toISOString() });
        return result.text;
      }
    } catch (err) {
      signal?.throwIfAborted();
      console.error(
        `${provider.name} failed:`,
        err instanceof Error ? err.name : "Unknown error"
      );
    }
  }

  console.warn("All AI providers failed or no keys configured");
  return null;
}

// Only the exact application-owned prefix is eligible for the system role.
// Unknown callers stay entirely in user content, never promoted to instructions.
function evidenceContent(prompt: string): string {
  const prefix = AI_SYSTEM_INSTRUCTIONS + AI_EVIDENCE_MARKER;
  return prompt.startsWith(prefix) ? prompt.slice(prefix.length) : prompt;
}

function chatMessages(prompt: string) {
  return [
    { role: "system", content: AI_SYSTEM_INSTRUCTIONS },
    { role: "user", content: evidenceContent(prompt) },
  ];
}

type ProviderResult = { text: string; requestedModel?: string; responseModel?: string };

function modelIdentifier(value: unknown): string | undefined {
  return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._:/@+-]{0,159}$/.test(value) ? value : undefined;
}

type ProviderResponse = {
  model?: unknown;
  modelVersion?: unknown;
  choices?: Array<{ message?: { content?: unknown } }>;
  candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
};

async function fetchProviderJson(url: string, init: RequestInit, timeoutMs: number, signal?: AbortSignal): Promise<ProviderResponse> {
  const controller = new AbortController();
  const combined = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 8000);
  try {
    combined.throwIfAborted();
    const response = await fetch(url, { ...init, signal: combined });
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new Error(`AI provider HTTP ${response.status}`);
    }
    return JSON.parse(await readBoundedText(response, 1_000_000, combined)) as ProviderResponse;
  } finally {
    clearTimeout(timeout);
  }
}

async function callDeepSeek(prompt: string, apiKey: string, signal?: AbortSignal): Promise<ProviderResult> {
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const maxTokens = Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 400);
  const timeoutMs = Number(process.env.AI_PROVIDER_TIMEOUT_MS ?? 8000);

  const data = await fetchProviderJson("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: chatMessages(prompt),
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  }, timeoutMs, signal);

  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("DeepSeek returned empty response");
  return { text, requestedModel: modelIdentifier(model), responseModel: modelIdentifier(data.model ?? data.modelVersion) };
}

async function callOpenRouter(prompt: string, apiKey: string, signal?: AbortSignal): Promise<ProviderResult> {
  const model = process.env.OPENROUTER_MODEL || "openrouter/free";
  const maxTokens = Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 600);
  const timeoutMs = Number(process.env.AI_PROVIDER_TIMEOUT_MS ?? 5000);

  const data = await fetchProviderJson("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://aeocheck.co",
      "X-Title": process.env.OPENROUTER_APP_NAME || "AEOCheck",
    },
    body: JSON.stringify({
      model,
      messages: chatMessages(prompt),
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  }, timeoutMs, signal);

  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("OpenRouter returned empty response");
  return { text, requestedModel: modelIdentifier(model), responseModel: modelIdentifier(data.model ?? data.modelVersion) };
}

async function callGemini(prompt: string, apiKey: string, signal?: AbortSignal): Promise<ProviderResult> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const maxTokens = Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 600);
  const timeoutMs = Number(process.env.AI_PROVIDER_TIMEOUT_MS ?? 5000);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const data = await fetchProviderJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: AI_SYSTEM_INSTRUCTIONS }] },
      contents: [{ role: "user", parts: [{ text: evidenceContent(prompt) }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
    }),
  }, timeoutMs, signal);

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) throw new Error("Gemini returned empty response");
  return { text, requestedModel: modelIdentifier(model), responseModel: modelIdentifier(data.model ?? data.modelVersion) };
}
