import { afterEach, describe, expect, it, vi } from "vitest";
import { analyzeAnswer, askGemini, askPerplexity, normalizeDomain, runVisibilityCheck, suggestPrompts } from "@/lib/ai-visibility";

const brand = { name: "AEOCheck", domain: "https://www.aeocheck.co/" };

afterEach(() => vi.unstubAllGlobals());

describe("analyzeAnswer", () => {
  it("detects a mention by name or domain and its list position", () => {
    const answer = ["Top AEO tools:", "1. Profound - enterprise", "2. Otterly.AI - budget", "3. AEOCheck - free scanner"].join("\n");
    expect(analyzeAnswer(answer, [], brand)).toEqual({ mentioned: true, cited: false, position: 3 });
    expect(analyzeAnswer("Try aeocheck.co for a quick audit.", [], brand).mentioned).toBe(true);
  });

  it("does not match the brand inside other words", () => {
    expect(analyzeAnswer("The SuperAEOCheckerPro tool", [], brand).mentioned).toBe(false);
  });

  it("detects citations on the brand domain and its subdomains only", () => {
    expect(analyzeAnswer("x", ["https://www.aeocheck.co/blog/aeo"], brand).cited).toBe(true);
    expect(analyzeAnswer("x", ["blog.aeocheck.co"], brand).cited).toBe(true);
    expect(analyzeAnswer("x", ["https://notaeocheck.co/"], brand).cited).toBe(false);
  });
});

describe("engines", () => {
  it("parses Perplexity answers and citations", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ choices: [{ message: { content: "Use AEOCheck." } }], citations: ["https://aeocheck.co/"] })));
    expect(await askPerplexity("q", "k")).toEqual({ answer: "Use AEOCheck.", citations: ["https://aeocheck.co/"] });
  });

  it("parses Gemini grounded answers using source titles as citations", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: "AEOCheck " }, { text: "is free." }] }, groundingMetadata: { groundingChunks: [{ web: { uri: "https://vertexaisearch.cloud.google.com/x", title: "aeocheck.co" } }] } }],
    })));
    const r = await askGemini("q", "k");
    expect(r).toEqual({ answer: "AEOCheck is free.", citations: ["aeocheck.co"] });
    expect(analyzeAnswer(r.answer, r.citations, brand)).toMatchObject({ mentioned: true, cited: true });
  });
});

describe("runVisibilityCheck", () => {
  it("summarizes mention and citation rates and isolates engine failures", async () => {
    const summary = await runVisibilityCheck(brand, ["a", "b"], [
      { name: "perplexity", ask: async (p) => ({ answer: p === "a" ? "AEOCheck is great" : "Other tools", citations: p === "a" ? ["aeocheck.co"] : [] }) },
      { name: "gemini", ask: async () => { throw new Error("HTTP 429"); } },
    ]);
    expect(summary.checked).toBe(2);
    expect(summary.mentionRate).toBe(50);
    expect(summary.citationRate).toBe(50);
    expect(summary.results.filter((r) => r.error)).toHaveLength(2);
  });
});

describe("helpers", () => {
  it("normalizes domains", () => {
    expect(normalizeDomain("https://www.AEOCheck.co/pricing")).toBe("aeocheck.co");
    expect(normalizeDomain("aeocheck.co")).toBe("aeocheck.co");
  });

  it("suggests prompts from the page topic without the brand name", () => {
    const prompts = suggestPrompts({ brandName: "AEOCheck", h1: "AEOCheck - AI Search Readiness Scanner" });
    expect(prompts[0]).toBe("What are the best AI Search Readiness Scanner options?");
    expect(prompts).toHaveLength(5);
  });
});
