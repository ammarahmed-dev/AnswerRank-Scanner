import { describe, expect, it, vi } from "vitest";
import { createAIInsightCache } from "@/lib/ai-insight-cache";
const insight = { recommendations: ["Fix headings"], quickWin: "Review heading", contentGap: "Explain product", summary: "Review findings" };
describe("bounded AI result reuse", () => {
  it("reuses matching evidence without sharing mutable result objects", async () => {
    const cache = createAIInsightCache(); const generate = vi.fn(async () => insight);
    const first = await cache("url", "prompt", generate); first!.recommendations[0] = "mutated";
    expect((await cache("url", "prompt", generate))?.recommendations).toEqual(["Fix headings"]);
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it("never returns stale insights for changed evidence during cooldown", async () => {
    const cache = createAIInsightCache(); const generate = vi.fn(async () => insight);
    await cache("url", "original", generate);
    expect(await cache("url", "changed", generate)).toBeNull();
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it("refreshes on expiry and evicts the oldest entry at capacity", async () => {
    let time = 0; const cache = createAIInsightCache({ maxEntries: 2, cooldownMs: 10, now: () => time });
    const generate = vi.fn(async () => insight);
    await cache("one", "a", generate); time = 10; await cache("one", "b", generate);
    await cache("two", "b", generate); await cache("three", "c", generate); await cache("one", "b", generate);
    expect(generate).toHaveBeenCalledTimes(5);
  });
  it("suppresses concurrent duplicates and does not cache failed output", async () => {
    const cache = createAIInsightCache(); let finish!: (value: null) => void;
    const generate = vi.fn(() => new Promise<null>(resolve => { finish = resolve; }));
    const first = cache("url", "prompt", generate);
    expect(await cache("url", "prompt", generate)).toBeNull(); finish(null); await first;
    expect(await cache("url", "prompt", generate)).toBeNull(); expect(generate).toHaveBeenCalledTimes(1);
  });
  it("does not publish a cancelled request's result", async () => {
    const cache = createAIInsightCache(); const controller = new AbortController();
    const generate = async () => { controller.abort(); return insight; };
    await expect(cache("url", "prompt", generate, controller.signal)).rejects.toMatchObject({ name: "AbortError" });
    expect(await cache("url", "prompt", async () => insight)).toBeNull();
  });
});
