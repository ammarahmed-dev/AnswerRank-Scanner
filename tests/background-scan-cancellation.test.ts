import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { scan, save } = vi.hoisted(() => ({ scan: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/auth-server", () => ({ getAuthContext: async () => ({ user: { id: "owner" }, plan: "pro" }) }));
vi.mock("@/lib/admin", () => ({ isMasterAdmin: () => false }));
vi.mock("@/lib/supabase-config", () => ({ getSupabaseServerUrl: () => "https://db.test", getSupabaseServiceHeaders: () => ({}), hasSupabaseConfig: () => true }));
vi.mock("@/lib/scan-core", () => ({ runScanCore: scan }));
vi.mock("@/lib/monitor-persistence", () => ({ saveMonitorSnapshot: save }));
import { POST as audit } from "@/app/api/audit/[id]/scan/route";
import { POST as monitor } from "@/app/api/monitor/[id]/scan/route";
import { loadScanRows } from "@/lib/scan-resource";

const result = { score: 0, checks: [], pagespeed: null, categoryScores: {}, methodology: { version: "fixture" } };
const rows = [{ id: "item", url: "https://example.invalid/page", status: "running", scanned_pages: 0, total_pages: 1, urls: ["https://example.invalid/page"], results: [] }];
const ctx = () => ({ params: Promise.resolve({ id: "item" }) });
const request = (signal: AbortSignal) => new Request("https://aeocheck.co/api/test", { method: "POST", signal, body: JSON.stringify({ url: "https://example.invalid/page" }) });
const pendingScan = (_url: string, options: { signal: AbortSignal }) => new Promise((_, reject) => {
  options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
});
beforeEach(() => {
  scan.mockReset().mockResolvedValue(result);
  save.mockReset().mockResolvedValue({ id: "snapshot", score: 0 });
  vi.spyOn(AbortSignal, "timeout").mockImplementation(ms => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new DOMException("Deadline exceeded", "TimeoutError")), ms);
    timer.unref?.();
    return controller.signal;
  });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

for (const [name, route] of [["audit", audit], ["monitor", monitor]] as const) {
  describe(`${name} scan cancellation`, () => {
    it("skips all network work for an already cancelled caller", async () => {
      const controller = new AbortController(); controller.abort();
      const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
      expect((await route(request(controller.signal), ctx())).status).toBe(499);
      expect(fetch).not.toHaveBeenCalled(); expect(scan).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
    });
    it("cancels a stalled ownership read without starting a scan", async () => {
      const controller = new AbortController(); const cancel = vi.fn();
      vi.stubGlobal("fetch", vi.fn(async () => new Response(new ReadableStream({ cancel }))));
      const work = route(request(controller.signal), ctx());
      await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
      controller.abort();
      expect((await work).status).toBe(499);
      expect(cancel).toHaveBeenCalled(); expect(scan).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
    });
    it("propagates cancellation to active scans and does not persist an error result", async () => {
      const controller = new AbortController(); const fetch = vi.fn(async () => Response.json(rows));
      vi.stubGlobal("fetch", fetch); scan.mockImplementation(pendingScan);
      const work = route(request(controller.signal), ctx());
      await vi.waitFor(() => expect(scan).toHaveBeenCalledOnce());
      const signal = scan.mock.calls[0][1].signal as AbortSignal;
      controller.abort();
      expect((await work).status).toBe(499); expect(signal.aborted).toBe(true);
      expect(fetch).toHaveBeenCalledOnce(); expect(save).not.toHaveBeenCalled();
    });
    it("checks cancellation even when the scanner resolves a late result", async () => {
      const controller = new AbortController(); const fetch = vi.fn(async () => Response.json(rows));
      vi.stubGlobal("fetch", fetch);
      scan.mockImplementation(async () => { controller.abort(); return result; });
      expect((await route(request(controller.signal), ctx())).status).toBe(499);
      expect(fetch).toHaveBeenCalledOnce(); expect(save).not.toHaveBeenCalled();
    });
    it("fails closed on an oversized ownership response", async () => {
      const cancel = vi.fn();
      vi.stubGlobal("fetch", vi.fn(async () => new Response(new ReadableStream({
        start(controller) { controller.enqueue(new Uint8Array(name === "audit" ? 2_500_001 : 16_385)); }, cancel,
      }))));
      expect((await route(request(new AbortController().signal), ctx())).status).toBe(503);
      expect(cancel).toHaveBeenCalled(); expect(scan).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
    });
    it("reports an uncertain write failure instead of claiming cancellation before saving", async () => {
      const controller = new AbortController();
      vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === "PATCH") { controller.abort(); throw new Error("private database detail"); }
        return Response.json(rows);
      }));
      save.mockImplementation(async () => { controller.abort(); throw new Error("private database detail"); });
      const response = await route(request(controller.signal), ctx());
      expect(response.status).toBe(name === "audit" ? 500 : 503);
      expect(await response.text()).not.toContain("private database detail");
    });
    it("lets an already dispatched persistence operation settle after cancellation", async () => {
      const controller = new AbortController();
      const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === "PATCH") { controller.abort(); expect(init.signal?.aborted).toBe(false); return new Response(null, { status: 204 }); }
        return Response.json(rows);
      });
      vi.stubGlobal("fetch", fetch);
      save.mockImplementation(async () => { controller.abort(); return { id: "snapshot", score: 0 }; });
      expect((await route(request(controller.signal), ctx())).status).toBe(name === "audit" ? 200 : 201);
      expect(scan).toHaveBeenCalledOnce();
      if (name === "audit") expect(fetch).toHaveBeenCalledTimes(2); else expect(save).toHaveBeenCalledOnce();
    });
  });
}

describe("scan resource deadlines", () => {
  it("keeps the read deadline active after headers and cancels stalled bodies", async () => {
    vi.useFakeTimers(); const cancel = vi.fn();
    const fetch = vi.fn(async () => new Response(new ReadableStream({ cancel })));
    vi.stubGlobal("fetch", fetch);
    const work = loadScanRows("https://db.test/fixture", 100, new AbortController().signal);
    const outcome = expect(work).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(10_001); await outcome;
    expect(cancel).toHaveBeenCalled();
  });
  it("cancels database error bodies and rejects non-array roots", async () => {
    const cancel = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new ReadableStream({ cancel }), { status: 503 })));
    await expect(loadScanRows("https://db.test/fixture", 100, new AbortController().signal)).rejects.toThrow("unavailable");
    expect(cancel).toHaveBeenCalledOnce();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "private" })));
    await expect(loadScanRows("https://db.test/fixture", 100, new AbortController().signal)).rejects.toThrow("Invalid scan resource");
  });
  it("aborts the manual monitor scan at its total deadline without saving", async () => {
    vi.useFakeTimers(); vi.stubGlobal("fetch", vi.fn(async () => Response.json(rows))); scan.mockImplementation(pendingScan);
    const work = monitor(request(new AbortController().signal), ctx());
    await vi.advanceTimersByTimeAsync(30_001);
    expect((await work).status).toBe(504); expect(save).not.toHaveBeenCalled();
  });
  it("retains audit timeout error reporting for an active caller", async () => {
    vi.useFakeTimers(); let saved: Record<string, unknown> | undefined;
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") { saved = JSON.parse(String(init.body)); return new Response(null, { status: 204 }); }
      return Response.json(rows);
    })); scan.mockImplementation(pendingScan);
    const work = audit(request(new AbortController().signal), ctx());
    await vi.advanceTimersByTimeAsync(30_001);
    expect((await work).status).toBe(200); expect(saved?.scanned_pages).toBe(1);
    expect(saved?.results).toMatchObject([{ status: "error", score: 0 }]);
  });
});
