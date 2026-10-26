import { createHash } from "node:crypto";
import type { AIInsights } from "@/types/index";

// Process-local optimization, not a distributed quota or durable provider budget.
export function createAIInsightCache({ maxEntries = 500, cooldownMs = 600_000, now = Date.now, maxConcurrent = 2 } = {}) {
  if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1) throw new Error("Invalid AI concurrency limit");
  let active = 0;
  const entries = new Map<string, { started: number; fingerprint: string; result?: AIInsights }>();
  return async (url: string, prompt: string, generate: () => Promise<AIInsights | null>, signal?: AbortSignal): Promise<AIInsights | null> => {
    signal?.throwIfAborted();
    const fingerprint = createHash("sha256").update(prompt).digest("hex");
    const time = now();
    const existing = entries.get(url);
    if (existing && time - existing.started < cooldownMs) {
      // Never reuse older evidence after the page, score or prompt changes.
      return existing.fingerprint === fingerprint && existing.result ? structuredClone(existing.result) : null;
    }
    // Cache hits remain available at capacity. Rejected work gets no cooldown entry.
    if (active >= maxConcurrent) return null;
    if (entries.size >= maxEntries && !entries.has(url)) entries.delete(entries.keys().next().value!);
    const entry: { started: number; fingerprint: string; result?: AIInsights } = { started: time, fingerprint };
    entries.set(url, entry);
    active++;
    try {
      const result = await generate();
      signal?.throwIfAborted();
      // A superseded/evicted request cannot replace newer evidence.
      if (result && entries.get(url) === entry) entry.result = structuredClone(result);
      return result ? structuredClone(result) : null;
    } finally {
      active--;
    }
  };
}
