/**
 * AI Provider Module
 * Handles Gemini â†’ OpenAI fallback chain
 */

export async function generateAIInsights(prompt: string): Promise<string | null> {
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const primaryProvider = process.env.AI_PROVIDER || "gemini";
  const allowFallbacks = process.env.AI_PROVIDER_FALLBACKS !== "false";

  // Determine provider order based on AI_PROVIDER setting
  let providers =
    primaryProvider === "deepseek"
      ? [
          { name: "DeepSeek", key: deepseekKey, call: callDeepSeek },
          { name: "OpenRouter", key: openRouterKey, call: callOpenRouter },
          { name: "OpenAI", key: openaiKey, call: callOpenAI },
          { name: "Gemini", key: geminiKey, call: callGemini },
        ]
      : primaryProvider === "openrouter"
      ? [
          { name: "OpenRouter", key: openRouterKey, call: callOpenRouter },
          { name: "DeepSeek", key: deepseekKey, call: callDeepSeek },
          { name: "OpenAI", key: openaiKey, call: callOpenAI },
          { name: "Gemini", key: geminiKey, call: callGemini },
        ]
      : primaryProvider === "openai"
        ? [
            { name: "OpenAI", key: openaiKey, call: callOpenAI },
            { name: "DeepSeek", key: deepseekKey, call: callDeepSeek },
            { name: "OpenRouter", key: openRouterKey, call: callOpenRouter },
            { name: "Gemini", key: geminiKey, call: callGemini },
          ]
        : [
            { name: "Gemini", key: geminiKey, call: callGemini },
            { name: "DeepSeek", key: deepseekKey, call: callDeepSeek },
            { name: "OpenRouter", key: openRouterKey, call: callOpenRouter },
            { name: "OpenAI", key: openaiKey, call: callOpenAI },
          ];

  if (!allowFallbacks) {
    providers = providers.slice(0, 1);
  }

  for (const provider of providers) {
    if (!provider.key) continue;

    try {
      const result = await provider.call(prompt, provider.key);
      if (result) {
        return result;
      }
    } catch (err) {
      console.error(
        `${provider.name} failed:`,
        err instanceof Error ? err.message : "Unknown error"
      );
    }
  }

  console.warn("All AI providers failed or no keys configured");
  return null;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function callDeepSeek(prompt: string, apiKey: string): Promise<string | null> {
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
  const maxTokens = Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 400);
  const timeoutMs = Number(process.env.AI_PROVIDER_TIMEOUT_MS ?? 8000);

  const response = await fetchWithTimeout("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  }, timeoutMs);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`DeepSeek API error: ${response.status} ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("DeepSeek returned empty response");
  }

  return text;
}

async function callOpenRouter(prompt: string, apiKey: string): Promise<string | null> {
  const model = process.env.OPENROUTER_MODEL || "openrouter/free";
  const maxTokens = Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 600);
  const timeoutMs = Number(process.env.AI_PROVIDER_TIMEOUT_MS ?? 5000);

  const response = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_NAME || "AEOCheck",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  }, timeoutMs);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenRouter API error: ${response.status} ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("OpenRouter returned empty response");
  }

  return text;
}

async function callGemini(prompt: string, apiKey: string): Promise<string | null> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const maxTokens = Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 600);
  const timeoutMs = Number(process.env.AI_PROVIDER_TIMEOUT_MS ?? 5000);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: maxTokens,
      },
    }),
  }, timeoutMs);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error: ${response.status} ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned empty response");
  }

  return text;
}

async function callOpenAI(prompt: string, apiKey: string): Promise<string | null> {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const maxTokens = Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 600);
  const timeoutMs = Number(process.env.AI_PROVIDER_TIMEOUT_MS ?? 5000);

  const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  }, timeoutMs);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(`OpenAI error details:`, errorData);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("OpenAI returned empty response");
  }

  return text;
}


