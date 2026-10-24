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
    expect(await askPerplexity("q", "k")).toEqual({ answer: "Use AEOCheck.", citations: ["https://aeocheck.co/"], requestedModel: "sonar" });
  });

  it("preserves Gemini source URIs without treating titles as verified domains", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: "AEOCheck " }, { text: "is free." }] }, groundingMetadata: { groundingChunks: [{ web: { uri: "https://vertexaisearch.cloud.google.com/x", title: "aeocheck.co" } }] } }],
    })));
    const r = await askGemini("q", "k");
    expect(r).toEqual({ answer: "AEOCheck is free.", citations: ["https://vertexaisearch.cloud.google.com/x"], requestedModel: "gemini-2.5-flash" });
    expect(analyzeAnswer(r.answer, r.citations, brand)).toMatchObject({ mentioned: true, cited: false });
  });
});

describe("runVisibilityCheck", () => {
  it("retains provenance and excludes unresolved redirect sources from citation rates", async () => {
    const summary = await runVisibilityCheck(brand, ["Is AEOCheck useful?", "Best tools?"], [{
      name: "gemini", ask: async () => ({ answer: "AEOCheck is one option.", citations: ["https://vertexaisearch.cloud.google.com/redirect"], requestedModel: "test-model" }),
    }]);
    expect(summary).toMatchObject({ checked: 2, citationChecked: 0, brandedChecked: 1, unbrandedChecked: 1 });
    expect(summary.results[0]).toMatchObject({ citationVerified: false, answer: "AEOCheck is one option.", requestedModel: "test-model", methodologyVersion: "visibility-2026-10-v2" });
    expect(summary.results[0].recordedAt).toBeTruthy();
  });

  it("rejects invalid citation strings rather than treating them as negative evidence", async () => {
    const summary = await runVisibilityCheck(brand, ["question"], [{ name: "gemini", ask: async () => ({ answer: "AEOCheck", citations: ["not a source URL"] }) }]);
    expect(summary.checked).toBe(0);
    expect(summary.results[0].error).toContain("invalid source URL");
  });
  it("does not count empty provider answers as valid negative observations", async () => {
    const summary = await runVisibilityCheck(brand, ["question"], [{ name: "gemini", ask: async () => ({ answer: "", citations: [] }) }]);
    expect(summary.checked).toBe(0);
    expect(summary.results[0].error).toContain("empty answer");
  });

  it("summarizes mention and citation rates and isolates engine failures", async () => {
    const summary = await runVisibilityCheck(brand, ["a", "b"], [
      { name: "perplexity", ask: async (p) => ({ answer: p === "a" ? "AEOCheck is great" : "Other tools", citations: p === "a" ? ["https://aeocheck.co/"] : [] }) },
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
