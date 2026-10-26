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

describe("AI generation concurrency", () => {
  it("bounds different URLs and allows rejected work after a slot settles", async () => {
    const cache = createAIInsightCache({ maxConcurrent: 2 });
    const finishes: Array<() => void> = [];
    const slow = vi.fn(() => new Promise<typeof insight>(resolve => finishes.push(() => resolve(insight))));
    const one = cache("one", "a", slow);
    const two = cache("two", "b", slow);
    const extra = vi.fn(async () => insight);
    expect(await cache("three", "c", extra)).toBeNull();
    expect(extra).not.toHaveBeenCalled();
    finishes[0](); await one;
    expect(await cache("three", "c", extra)).toEqual(insight);
    finishes[1](); await two;
    expect(slow).toHaveBeenCalledTimes(2);
  });
  it("serves a completed cache hit while a generation slot is busy", async () => {
    const cache = createAIInsightCache({ maxConcurrent: 1 });
    await cache("saved", "a", async () => insight);
    let finish!: () => void;
    const pending = cache("busy", "b", () => new Promise<null>(resolve => { finish = () => resolve(null); }));
    const unused = vi.fn(async () => insight);
    expect(await cache("saved", "a", unused)).toEqual(insight);
    expect(unused).not.toHaveBeenCalled();
    finish(); await pending;
  });
  it("releases a slot after a thrown provider failure", async () => {
    const cache = createAIInsightCache({ maxConcurrent: 1 });
    await expect(cache("failed", "a", async () => { throw new Error("fixture"); })).rejects.toThrow("fixture");
    expect(await cache("next", "b", async () => insight)).toEqual(insight);
  });
  it("keeps cancelled work counted until it actually settles", async () => {
    const cache = createAIInsightCache({ maxConcurrent: 1 });
    const controller = new AbortController(); let finish!: () => void;
    const pending = cache("cancelled", "a", () => new Promise<typeof insight>(resolve => { finish = () => resolve(insight); }), controller.signal);
    const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    const next = vi.fn(async () => insight);
    expect(await cache("next", "b", next)).toBeNull();
    expect(next).not.toHaveBeenCalled();
    finish(); await rejected;
    expect(await cache("next", "b", next)).toEqual(insight);
  });
  it.each([0, -1, 1.5, NaN, Infinity])("rejects invalid concurrency %s", maxConcurrent => {
    expect(() => createAIInsightCache({ maxConcurrent })).toThrow("Invalid AI concurrency limit");
  });
});
