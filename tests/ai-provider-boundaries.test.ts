import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateAIInsights } from "@/lib/ai-provider";

beforeEach(() => {
  for (const name of ["DEEPSEEK_API_KEY", "OPENROUTER_API_KEY", "GEMINI_API_KEY"]) vi.stubEnv(name, "fixture-key");
  vi.stubEnv("AI_PROVIDER", "deepseek");
  vi.stubEnv("AI_PROVIDER_FALLBACKS", "false");
  vi.stubEnv("AI_PROVIDER_TIMEOUT_MS", "1000");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("recommendation provider boundaries", () => {
  it.each(["deepseek", "openrouter", "gemini"])("reads bounded %s text", async provider => {
    vi.stubEnv("AI_PROVIDER", provider);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(provider === "gemini"
      ? { candidates: [{ content: { parts: [{ text: "insights" }] } }] }
      : { choices: [{ message: { content: "insights" } }] }))));
    expect(await generateAIInsights("fixture")).toBe("insights");
  });

  it("aborts a body that stalls after successful headers", async () => {
    vi.stubEnv("AI_PROVIDER_TIMEOUT_MS", "15");
    const cancel = vi.fn();
    let receivedSignal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => {
      receivedSignal = init.signal;
      return new Response(new ReadableStream({ cancel }));
    }));
    expect(await generateAIInsights("fixture")).toBeNull();
    expect(receivedSignal?.aborted).toBe(true);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("cancels oversized decoded bodies", async () => {
    const cancel = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(1_000_001)); }, cancel,
    }))));
    expect(await generateAIInsights("fixture")).toBeNull();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("does not start fallback providers after caller cancellation", async () => {
    vi.stubEnv("AI_PROVIDER_FALLBACKS", "true");
    const controller = new AbortController();
    const cancel = vi.fn();
    const fetchMock = vi.fn(async () => new Response(new ReadableStream({ cancel })));
    vi.stubGlobal("fetch", fetchMock);
    const work = generateAIInsights("fixture", controller.signal);
    const outcome = expect(work).rejects.toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    controller.abort();
    await outcome;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("cancels HTTP error bodies without logging provider payloads", async () => {
    const cancel = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new ReadableStream({ cancel }), { status: 500 })));
    expect(await generateAIInsights("fixture")).toBeNull();
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith("DeepSeek failed:", "Error");
  });
});
