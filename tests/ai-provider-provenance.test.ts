import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateAIInsights } from "@/lib/ai-provider";
beforeEach(() => {
  for (const name of ["DEEPSEEK_API_KEY", "OPENROUTER_API_KEY", "GEMINI_API_KEY"]) vi.stubEnv(name, "fixture-key");
  vi.stubEnv("AI_PROVIDER_FALLBACKS", "false");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const envelope = (provider: string, model: unknown) => provider === "gemini"
  ? { modelVersion: model, candidates: [{ content: { parts: [{ text: "insights" }] } }] }
  : { model, choices: [{ message: { content: "insights" } }] };
describe("server-controlled recommendation provenance", () => {
  it.each(["deepseek", "openrouter", "gemini"])("records requested and reported models separately for %s", async provider => {
    vi.stubEnv("AI_PROVIDER", provider);
    vi.stubEnv(provider === "deepseek" ? "DEEPSEEK_MODEL" : provider === "openrouter" ? "OPENROUTER_MODEL" : "GEMINI_MODEL", "requested/alias");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(envelope(provider, "reported/model-v1")))));
    const receipt = vi.fn();
    const before = Date.now();
    expect(await generateAIInsights("fixture", undefined, receipt)).toBe("insights");
    const metadata = receipt.mock.calls[0][0];
    expect(metadata).toMatchObject({ kind: "provider_generated", requestedModel: "requested/alias", responseModel: "reported/model-v1" });
    expect(metadata.provider).toBe({ deepseek: "DeepSeek", openrouter: "OpenRouter", gemini: "Gemini" }[provider]);
    expect(Date.parse(metadata.generatedAt)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(metadata.generatedAt)).toBeLessThanOrEqual(Date.now());
    expect(receipt).toHaveBeenCalledOnce();
  });
  it.each([undefined, 123, "x".repeat(161), "fake\nsecret", "https://model.test/?secret=fixture"])("omits malformed reported model %j", async model => {
    vi.stubEnv("AI_PROVIDER", "openrouter");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(envelope("openrouter", model)))));
    const receipt = vi.fn();
    expect(await generateAIInsights("fixture", undefined, receipt)).toBe("insights");
    expect(receipt.mock.calls[0][0].responseModel).toBeUndefined();
  });
  it("records the successful fallback provider only", async () => {
    vi.stubEnv("AI_PROVIDER", "deepseek"); vi.stubEnv("AI_PROVIDER_FALLBACKS", "true");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response("failure", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(envelope("openrouter", "routed/model")))));
    const receipt = vi.fn();
    expect(await generateAIInsights("fixture", undefined, receipt)).toBe("insights");
    expect(receipt).toHaveBeenCalledOnce();
    expect(receipt.mock.calls[0][0].provider).toBe("OpenRouter");
  });
  it("emits no provenance when every provider fails", async () => {
    vi.stubEnv("AI_PROVIDER", "deepseek");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("failure", { status: 503 })));
    const receipt = vi.fn();
    expect(await generateAIInsights("fixture", undefined, receipt)).toBeNull();
    expect(receipt).not.toHaveBeenCalled();
  });
});
