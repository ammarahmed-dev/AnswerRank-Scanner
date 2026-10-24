import { afterEach, describe, expect, it, vi } from "vitest";
const { safeFetch } = vi.hoisted(() => ({ safeFetch: vi.fn() }));
vi.mock("@/lib/url-safety", () => ({ safeFetch }));
import { discoverPages } from "@/lib/page-discovery";
afterEach(() => vi.clearAllMocks());

describe("page discovery fetch boundaries", () => {
  it("cancels non-page responses instead of downloading them", async () => {
    const cancels: ReturnType<typeof vi.fn>[] = [];
    safeFetch.mockImplementation(async () => {
      const cancel = vi.fn(); cancels.push(cancel);
      return { response: { ok: true, headers: new Headers({ "content-type": "application/pdf" }), body: { cancel } } };
    });
    expect((await discoverPages("https://example.test", 5)).urls).toEqual(["https://example.test/"]);
    expect(cancels.length).toBeGreaterThan(0);
    expect(cancels.every(cancel => cancel.mock.calls.length === 1)).toBe(true);
  });
  it("rejects chunked oversized pages and cancels their streams", async () => {
    const cancels: ReturnType<typeof vi.fn>[] = [];
    safeFetch.mockImplementation(async () => {
      const cancel = vi.fn(); cancels.push(cancel);
      const body = new ReadableStream<Uint8Array>({ pull(c) { c.enqueue(new Uint8Array(1_000_000)); }, cancel }, { highWaterMark: 0 });
      return { response: { ok: true, headers: new Headers({ "content-type": "text/html" }), body } };
    });
    const result = await discoverPages("https://example.test", 5);
    expect(result.urls).toEqual(["https://example.test/"]);
    expect(cancels.every(cancel => cancel.mock.calls.length === 1)).toBe(true);
  });
});
