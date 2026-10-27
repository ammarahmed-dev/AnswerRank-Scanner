import { afterEach, describe, expect, it, vi } from "vitest";
const { safeFetch } = vi.hoisted(() => ({ safeFetch: vi.fn() }));
vi.mock("@/lib/url-safety", () => ({ safeFetch }));
import { verifyCitationDestinations } from "@/lib/citation-destinations";
import { runVisibilityCheck } from "@/lib/ai-visibility";

const brand = { name: "AEOCheck", domain: "aeocheck.co" };
const response = (finalUrl: string, status = 200) => ({ finalUrl, response: { ok: status >= 200 && status < 300, status, body: { cancel: vi.fn().mockResolvedValue(undefined) } } });
const run = (citations: string[]) => runVisibilityCheck(brand, ["Best tools?"], [{ name: "gemini", ask: async () => ({ answer: "AEOCheck is an option.", citations }) }], verifyCitationDestinations);
afterEach(() => { vi.useRealTimers(); vi.resetAllMocks(); });

describe("bounded citation destination evidence", () => {
  it("uses redirect destinations for both positive and negative attribution", async () => {
    safeFetch.mockImplementation(async (url: string) => response(url.includes("wrapper") ? "https://aeocheck.co/guide" : "https://other.example/final"));
    const positive = await run(["https://wrapper.example/source"]);
    expect(positive.results[0]).toMatchObject({ cited: true, citationVerified: true, citationEvidence: [{ state: "resolved", finalUrl: "https://aeocheck.co/guide", httpStatus: 200 }] });
    const negative = await run(["https://aeocheck.co/redirect-away"]);
    expect(negative.results[0]).toMatchObject({ mentioned: true, cited: false, citationVerified: true });
    expect(negative.citationRate).toBe(0);
    expect(safeFetch).toHaveBeenCalledWith("https://wrapper.example/source", expect.objectContaining({ method: "HEAD", maxRedirects: 3, signal: expect.any(AbortSignal) }));
    expect(safeFetch.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
  });
  it.each([401,403,404,405,429,500,503])("keeps HTTP %s unknown instead of a negative citation", async status => {
    const result = response("https://aeocheck.co/", status);
    safeFetch.mockResolvedValue(result);
    const summary = await run(["https://aeocheck.co/"]);
    expect(summary).toMatchObject({ checked: 1, citationChecked: 0, mentionRate: 100 });
    expect(summary.results[0]).toMatchObject({ cited: false, citationVerified: false, citationEvidence: [{ state: "unverified", httpStatus: status, reason: "http_error" }] });
    expect(result.response.body.cancel).toHaveBeenCalledOnce();
  });
  it("retains a positive when another source is unavailable", async () => {
    safeFetch.mockImplementation(async (url: string) => { if (url.includes("unknown")) throw new Error("sensitive network error"); return response("https://aeocheck.co/"); });
    const summary = await run(["https://aeocheck.co/", "https://unknown.example/"]);
    expect(summary).toMatchObject({ citationChecked: 1, citationRate: 100 });
    expect(JSON.stringify(summary)).not.toContain("sensitive");
  });
  it("does not turn failed safe-fetch validation into a negative observation", async () => {
    safeFetch.mockRejectedValue(new Error("Private IP ranges not allowed"));
    expect((await run(["http://127.0.0.1/"])).results[0]).toMatchObject({ citationVerified: false, citationEvidence: [{ reason: "request_failed" }] });
  });
  it("deduplicates globally and caps one run at twenty unique source requests", async () => {
    safeFetch.mockImplementation(async (url: string) => response(url));
    const urls = Array.from({ length: 25 }, (_, i) => `https://source${i}.example/`);
    const evidence = await verifyCitationDestinations([...urls, ...urls]);
    expect(safeFetch).toHaveBeenCalledTimes(20);
    expect(evidence).toHaveLength(25);
    expect(evidence.slice(20).every(e => e.reason === "budget")).toBe(true);
    expect((await run(urls)).citationChecked).toBe(0);
  });
  it("admits at most three source checks concurrently", async () => {
    const pending: Array<() => void> = [];
    safeFetch.mockImplementation((url: string) => new Promise(resolve => pending.push(() => resolve(response(url)))));
    const work = verifyCitationDestinations(Array.from({ length: 5 }, (_, i) => `https://s${i}.example/`));
    expect(safeFetch).toHaveBeenCalledTimes(3);
    pending.shift()!();
    await vi.waitFor(() => expect(safeFetch).toHaveBeenCalledTimes(4));
    pending.splice(0).forEach(resolve => resolve());
    await vi.waitFor(() => expect(safeFetch).toHaveBeenCalledTimes(5));
    pending.splice(0).forEach(resolve => resolve());
    await work;
  });
  it("settles at the run deadline even if DNS/fetch ignores abort and cancels a late response", async () => {
    vi.useFakeTimers();
    let complete!: (value: ReturnType<typeof response>) => void;
    safeFetch.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const work = verifyCitationDestinations(["https://slow.example/"]);
    await vi.advanceTimersByTimeAsync(8_000);
    expect(await work).toEqual([{ sourceUrl: "https://slow.example/", state: "unverified", reason: "deadline" }]);
    const late = response("https://aeocheck.co/");
    complete(late);
    await vi.advanceTimersByTimeAsync(1);
    expect(late.response.body.cancel).toHaveBeenCalledOnce();
  });
  it("stops queued work after the shared deadline", async () => {
    vi.useFakeTimers(); safeFetch.mockImplementation(() => new Promise(() => {}));
    const work = verifyCitationDestinations(Array.from({ length: 8 }, (_, i) => `https://s${i}.example/`));
    await vi.advanceTimersByTimeAsync(8_000);
    expect((await work).every(e => e.reason === "deadline")).toBe(true);
    expect(safeFetch).toHaveBeenCalledTimes(3);
  });
  it("keeps direct source URLs unverified without a destination checker", async () => {
    const summary = await runVisibilityCheck(brand, ["q"], [{ name: "gemini", ask: async () => ({ answer: "AEOCheck", citations: ["https://aeocheck.co/"] }) }]);
    expect(summary.results[0]).toMatchObject({ cited: false, citationVerified: false, citationEvidence: [{ reason: "not_checked" }] });
    expect(summary.citationChecked).toBe(0);
  });
  it("shares destination checks across prompts and engines within one run", async () => {
    safeFetch.mockResolvedValue(response("https://aeocheck.co/"));
    const summary = await runVisibilityCheck(brand, ["one", "two"], [
      { name: "gemini", ask: async () => ({ answer: "AEOCheck", citations: ["https://wrapper.example/x", "https://wrapper.example/x"] }) },
      { name: "perplexity", ask: async () => ({ answer: "AEOCheck", citations: ["https://wrapper.example/x"] }) },
    ], verifyCitationDestinations);
    expect(safeFetch).toHaveBeenCalledOnce();
    expect(summary).toMatchObject({ checked: 4, citationChecked: 4, citationRate: 100 });
  });
  it("does not store oversized redirect destinations", async () => {
    safeFetch.mockResolvedValue(response("https://aeocheck.co/" + "x".repeat(4096)));
    const summary = await run(["https://wrapper.example/x"]);
    expect(summary.citationChecked).toBe(0);
    expect(summary.results[0].citationEvidence?.[0]).not.toHaveProperty("finalUrl");
  });
  it("accepts an empty engine source list as a checked negative and preserves engine failures", async () => {
    const summary = await run([]);
    expect(summary).toMatchObject({ checked: 1, citationChecked: 1, citationRate: 0 });
    expect(safeFetch).not.toHaveBeenCalled();
  });
});
