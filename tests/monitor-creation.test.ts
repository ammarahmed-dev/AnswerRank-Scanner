import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { auth, admin, safe } = vi.hoisted(() => ({
  auth: { user: { id: "owner", email: "owner@example.invalid" } as { id: string; email: string } | null, plan: "free" },
  admin: vi.fn(() => false), safe: vi.fn(async (_url: string) => undefined),
}));
vi.mock("@/lib/auth-server", () => ({ getAuthContext: async () => auth }));
vi.mock("@/lib/admin", () => ({ isMasterAdmin: admin }));
vi.mock("@/lib/url-safety", () => ({ assertPublicUrl: safe }));
vi.mock("@/lib/supabase-config", () => ({ getSupabaseServerUrl: () => "https://db.test", getSupabaseServiceHeaders: () => ({}), hasSupabaseConfig: () => true }));
import { POST } from "@/app/api/monitor/route";
import { createMonitorWithLimit } from "@/lib/monitor-creation";
const input = { userId: "owner", url: "https://example.invalid/", label: null, limit: 1 };
const item = { id: "monitor-id", url: input.url, label: null, frequency: "weekly", last_scanned_at: null, created_at: "2026-10-25T00:00:00Z" };
const request = (body: unknown) => new Request("https://aeocheck.co/api/monitor", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { auth.user = { id: "owner", email: "owner@example.invalid" }; auth.plan = "free"; admin.mockReset().mockReturnValue(false); safe.mockReset().mockResolvedValue(undefined); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("atomic monitor creation client", () => {
  it("returns only validated committed monitor fields", async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => Response.json({ limit_reached: false, item: { ...item, unrelated: "private" } }));
    vi.stubGlobal("fetch",fetch);
    expect(await createMonitorWithLimit(input)).toEqual(item);
    expect(fetch).toHaveBeenCalledOnce(); expect(fetch.mock.calls[0][0]).toBe("https://db.test/rest/v1/rpc/create_monitor_with_limit");
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({ p_user_id: "owner", p_url: input.url, p_label: null, p_limit: 1 });
  });
  it.each([404,503])("fails closed on HTTP %s without direct insert fallback", async status => {
    const fetch = vi.fn(async () => Response.json({ code: "PGRST202", message: "private" },{status}));vi.stubGlobal("fetch",fetch);
    await expect(createMonitorWithLimit(input)).rejects.toThrow("unavailable");expect(fetch).toHaveBeenCalledOnce();
  });
  it.each([null,[],{}, {limit_reached:false}, {limit_reached:true,item:{}}, {limit_reached:false,item:{...item,url:"https://other.invalid"}}, {limit_reached:false,item:{...item,created_at:"invalid"}}])("rejects malformed successful result %j", async data => {
    vi.stubGlobal("fetch",vi.fn(async () => Response.json(data)));
    await expect(createMonitorWithLimit(input)).rejects.toThrow("invalid result");
  });
  it("cancels an oversized streamed body", async () => {
    const cancel=vi.fn();vi.stubGlobal("fetch",vi.fn(async () => new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(131_073));},cancel}))));
    await expect(createMonitorWithLimit(input)).rejects.toThrow("byte limit");expect(cancel).toHaveBeenCalledOnce();
  });
  it("keeps the deadline active after response headers", async () => {
    const controller=new AbortController();vi.spyOn(AbortSignal,"timeout").mockReturnValue(controller.signal);
    const cancel=vi.fn();vi.stubGlobal("fetch",vi.fn(async () => new Response(new ReadableStream({cancel}))));
    const work=createMonitorWithLimit(input);const outcome=expect(work).rejects.toMatchObject({name:"AbortError"});
    controller.abort();await outcome;expect(cancel).toHaveBeenCalled();
  });
});

describe("monitor creation API", () => {
  it.each([["free",1],["onetime",1],["pro",10],["agency",999]])("preserves the server cap for %s", async (plan,cap) => {
    auth.plan=plan as string;
    const fetch=vi.fn(async (_url:string,_init?:RequestInit) => Response.json({limit_reached:false,item}));vi.stubGlobal("fetch",fetch);
    const response=await POST(request({url:input.url,p_limit:9999,limit:9999,userId:"other"}));
    expect(response.status).toBe(201);expect((await response.json()).item).toEqual(item);
    expect(fetch).toHaveBeenCalledOnce();expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toMatchObject({p_user_id:"owner",p_limit:cap});
    expect(safe).toHaveBeenCalledWith(input.url);
  });
  it("preserves the admin cap and normalized label", async () => {
    admin.mockReturnValue(true);const fetch=vi.fn(async (_url:string,_init?:RequestInit)=>Response.json({limit_reached:false,item:{...item,label:"Example"}}));vi.stubGlobal("fetch",fetch);
    expect((await POST(request({url:input.url,label:" Example "}))).status).toBe(201);
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toMatchObject({p_limit:999,p_label:"Example"});
  });
  it.each([[{limit_reached:true},200,422],[{code:"23505",message:"private"},409,409],[{code:"PGRST202",message:"private"},404,503]])("handles cap, duplicate and unavailable outcomes", async (body,status,expected) => {
    const fetch=vi.fn(async()=>Response.json(body,{status}));vi.stubGlobal("fetch",fetch);
    const response=await POST(request({url:input.url}));expect(response.status).toBe(expected);expect(await response.text()).not.toContain("private");expect(fetch).toHaveBeenCalledOnce();
  });
  it.each([null,[],{url:2},{url:input.url,padding:"x".repeat(40_000)}])("rejects invalid input before database work: %j", async body => {
    const fetch=vi.fn();vi.stubGlobal("fetch",fetch);
    expect([400,413]).toContain((await POST(request(body))).status);expect(fetch).not.toHaveBeenCalled();
  });
  it("retains authentication and public-URL checks before creation", async () => {
    const fetch=vi.fn();vi.stubGlobal("fetch",fetch);auth.user=null;
    expect((await POST(request({url:input.url}))).status).toBe(401);expect(fetch).not.toHaveBeenCalled();
    auth.user={id:"owner",email:"owner@example.invalid"};safe.mockRejectedValue(new Error("Private address"));
    expect((await POST(request({url:input.url}))).status).toBe(400);expect(fetch).not.toHaveBeenCalled();
  });
});
