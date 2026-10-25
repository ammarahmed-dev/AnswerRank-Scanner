import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/supabase-config", () => ({ getSupabaseServerUrl: () => "https://db.test", getSupabaseServiceHeaders: () => ({ "Content-Type": "application/json" }) }));
import { saveAuditPageResult } from "@/lib/audit-persistence";
const page = { url: "https://example.invalid", score: 0, status: "done" as const, issues: [] };
const progress = { scanned_pages: 1, total_pages: 2, aggregate_score: 0, complete: false };
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe("atomic audit persistence client", () => {
  it("passes only owner, audit and new result and returns committed progress", async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => Response.json([{ ...progress, unrelated: "private" }]));
    vi.stubGlobal("fetch", fetch);
    expect(await saveAuditPageResult("audit", "owner", page)).toEqual({ scannedPages: 1, totalPages: 2, aggregateScore: 0, complete: false });
    expect(fetch).toHaveBeenCalledOnce(); expect(fetch.mock.calls[0][0]).toBe("https://db.test/rest/v1/rpc/save_audit_page_result");
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({ p_audit_id: "audit", p_user_id: "owner", p_page_result: page });
  });
  it.each([["23505",409],["55000",409],["P0002",404],["22023",400]])("maps structured conflict %s without leaking database text", async (code,status) => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ code, message: "private database payload" }, { status: 400 })));
    await expect(saveAuditPageResult("audit", "owner", page)).rejects.toMatchObject({ status, message: expect.not.stringContaining("private") });
  });
  it.each([404,503])("fails closed on unavailable/missing RPC HTTP %s without legacy writes", async status => {
    const fetch = vi.fn(async () => Response.json({ code: "PGRST202" }, { status })); vi.stubGlobal("fetch", fetch);
    await expect(saveAuditPageResult("audit", "owner", page)).rejects.toThrow("unavailable"); expect(fetch).toHaveBeenCalledOnce();
  });
  it.each([[],{},null,[{...progress,scanned_pages:0}],[{...progress,complete:true}],[{...progress,aggregate_score:101}],[{...progress,total_pages:0}]])("rejects invalid success %j", async rows => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(rows)));
    await expect(saveAuditPageResult("audit", "owner", page)).rejects.toThrow();
  });
  it("accepts a completed all-error audit without inventing a zero aggregate", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json([{ ...progress, total_pages: 1, aggregate_score: null, complete: true }])));
    expect(await saveAuditPageResult("audit", "owner", page)).toMatchObject({ aggregateScore: null, complete: true });
  });
  it("cancels oversized success/error bodies", async () => {
    const cancel = vi.fn(); vi.stubGlobal("fetch", vi.fn(async () => new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(16_385)); }, cancel }))));
    await expect(saveAuditPageResult("audit", "owner", page)).rejects.toThrow("byte limit"); expect(cancel).toHaveBeenCalledOnce();
  });
});
