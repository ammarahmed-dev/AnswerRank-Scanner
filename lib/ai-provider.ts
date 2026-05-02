/**
 * AI Provider Module
 * Handles Gemini → OpenAI fallback chain
 */

export async function generateAIInsights(prompt: string): Promise<string | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  // Try Gemini first
  if (geminiKey) {
    try {
      const result = await callGemini(prompt, geminiKey);
      if (result) return result;
    } catch (err) {
      console.error("Gemini failed:", err instanceof Error ? err.message : "Unknown error");
    }
  }

  // Fallback to OpenAI
  if (openaiKey) {
    try {
      const result = await callOpenAI(prompt, openaiKey);
      if (result) return result;
    } catch (err) {
      console.error("OpenAI failed:", err instanceof Error ? err.message : "Unknown error");
    }
  }

  // Both failed or no keys configured
  return null;
}

async function callGemini(prompt: string, apiKey: string): Promise<string | null> {
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const maxTokens = Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 600);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
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
  });

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

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI API error: ${response.status} ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("OpenAI returned empty response");
  }

  return text;
}
