import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase-config", () => ({ getSupabaseServerUrl: () => "https://db.test", getSupabaseServiceHeaders: () => ({ "Content-Type": "application/json" }) }));
import { saveMonitorSnapshot } from "@/lib/monitor-persistence";
const input = { monitorId: "monitor", userId: "owner", score: 0, categoryScores: { metadata: 0 }, methodologyVersion: "method-v1" };
afterEach(() => { vi.unstubAllGlobals(); });

describe("atomic monitor persistence client", () => {
  it("uses only the atomic RPC with owner and producing method", async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => Response.json([{ id: "snapshot", score: 0, scanned_at: "2026-10-25T00:00:00Z", unrelated: "private" }]));
    vi.stubGlobal("fetch", fetch);
    expect(await saveMonitorSnapshot(input)).toEqual({ id: "snapshot", score: 0, scanned_at: "2026-10-25T00:00:00Z" });
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][0]).toBe("https://db.test/rest/v1/rpc/save_monitor_snapshot");
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toMatchObject({ p_user_id: "owner", p_monitor_id: "monitor", p_methodology_version: "method-v1", p_score: 0 });
    expect(fetch.mock.calls[0][1]!.signal).toBeInstanceOf(AbortSignal);
  });
  it.each([404, 503])("fails closed on RPC HTTP %s without split-write fallback", async status => {
    const cancel = vi.fn();
    const fetch = vi.fn(async () => new Response(new ReadableStream({ cancel }), { status }));
    vi.stubGlobal("fetch", fetch);
    await expect(saveMonitorSnapshot(input)).rejects.toThrow("unavailable");
    expect(fetch).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
  });
  it.each([[], {}, null, [{ id: "bad", score: 50, scanned_at: "2026-10-25" }], [{ id: "bad", score: 0, scanned_at: "invalid" }]])("rejects invalid success response %j", async body => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(body)));
    await expect(saveMonitorSnapshot(input)).rejects.toThrow();
  });
  it("cancels an oversized response", async () => {
    const cancel = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(70_000)); }, cancel }))));
    await expect(saveMonitorSnapshot(input)).rejects.toThrow("byte limit");
    expect(cancel).toHaveBeenCalledOnce();
  });
});
