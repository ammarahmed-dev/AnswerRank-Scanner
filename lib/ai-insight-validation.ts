import type { AIInsights } from "@/types/index";

// Treat provider output as untrusted data. Never expose raw failures as report copy.
const MAX_RESPONSE_CHARS = 32_768;
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown, max: number, allowEmpty = false): value is string {
  return typeof value === "string" && value.length <= max && (allowEmpty || value.trim().length > 0);
}
function strings(value: unknown, count: number, length: number): value is string[] {
  return Array.isArray(value) && value.length <= count && value.every(item => text(item, length));
}

export function parseValidatedAIInsights(raw: string): AIInsights | null {
  if (raw.length > MAX_RESPONSE_CHARS) return null;
  // Tolerate one complete JSON fence, but not prose surrounding an embedded object.
  const cleaned = raw.trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i, "$1");
  let value: unknown;
  try { value = JSON.parse(cleaned); } catch { return null; }
  if (!object(value) || !strings(value.recommendations, 5, 800) ||
      !text(value.quickWin, 800) || !text(value.contentGap, 800) || !text(value.summary, 1200)) return null;

  const result: AIInsights = {
    recommendations: value.recommendations.map(item => item.trim()),
    quickWin: value.quickWin.trim(), contentGap: value.contentGap.trim(), summary: value.summary.trim(),
  };
  if (value.schemaRecommendations !== undefined) {
    const schema = value.schemaRecommendations;
    if (!object(schema) || !strings(schema.missing, 10, 80) ||
        !text(schema.priority, 80, true) || !text(schema.reasoning, 1200, true)) return null;
    result.schemaRecommendations = {
      // The scanner supplies actual detected schema; never trust provider claims.
      detected: [], missing: schema.missing.map(item => item.trim()),
      priority: schema.priority.trim(), reasoning: schema.reasoning.trim(),
    };
  }
  return result;
}
