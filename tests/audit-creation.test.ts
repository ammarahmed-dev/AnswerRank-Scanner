import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
const {auth,admin,discover,safe}=vi.hoisted(()=>({
  auth:{user:{id:"owner",email:"owner@example.invalid"} as {id:string;email:string}|null,plan:"free"},
  admin:vi.fn(()=>false),discover:vi.fn(),safe:vi.fn(),
}));
vi.mock("@/lib/auth-server",()=>({getAuthContext:async()=>auth}));
vi.mock("@/lib/admin",()=>({isMasterAdmin:admin}));
vi.mock("@/lib/url-safety",()=>({assertPublicUrl:safe}));
vi.mock("@/lib/page-discovery",()=>({discoverPages:discover}));
vi.mock("@/lib/supabase-config",()=>({getSupabaseServerUrl:()=>"https://db.test",getSupabaseServiceHeaders:()=>({}),hasSupabaseConfig:()=>true}));
import {POST} from "@/app/api/audit/route";
import {createAuditWithLimits} from "@/lib/audit-creation";
const targets=["https://example.invalid/"];
const input={userId:"owner",domain:"example.invalid",urls:targets,totalDiscovered:1,pageLimit:5,monthlyLimit:1,rollingLimit:null,windowHours:0};
const request=(body:unknown={domain:"https://example.invalid"})=>new Request("https://aeocheck.co/api/audit",{method:"POST",body:JSON.stringify(body)});
beforeEach(()=>{auth.user={id:"owner",email:"owner@example.invalid"};auth.plan="free";admin.mockReset().mockReturnValue(false);safe.mockReset().mockResolvedValue(undefined);discover.mockReset().mockResolvedValue({urls:targets,totalDiscovered:1});});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

describe("atomic audit creation client",()=>{
  it("sends only creation parameters and accepts the committed ID",async()=>{
    const fetch=vi.fn(async(_url:string,_init?:RequestInit)=>Response.json({limit_reached:null,id:"audit-id",private:"unrelated"}));vi.stubGlobal("fetch",fetch);
    expect(await createAuditWithLimits(input)).toBe("audit-id");expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][0]).toBe("https://db.test/rest/v1/rpc/create_audit_with_limits");
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toMatchObject({p_user_id:"owner",p_urls:targets,p_monthly_limit:1,p_rolling_limit:null});
  });
  it.each(["monthly","rolling"])("returns the transaction's %s limit",async window=>{
    vi.stubGlobal("fetch",vi.fn(async()=>Response.json({limit_reached:window})));
    await expect(createAuditWithLimits(input)).rejects.toMatchObject({window});
  });
  it.each([404,503])("fails closed on HTTP %s and cancels its body",async status=>{
    const cancel=vi.fn(),fetch=vi.fn(async()=>new Response(new ReadableStream({cancel}),{status}));vi.stubGlobal("fetch",fetch);
    await expect(createAuditWithLimits(input)).rejects.toThrow("unavailable");expect(fetch).toHaveBeenCalledOnce();expect(cancel).toHaveBeenCalledOnce();
  });
  it.each([null,[],{}, {limit_reached:null}, {limit_reached:null,id:""},{limit_reached:"weekly"},{limit_reached:"monthly",id:"conflict"}])("rejects invalid success %j",async result=>{
    vi.stubGlobal("fetch",vi.fn(async()=>Response.json(result)));await expect(createAuditWithLimits(input)).rejects.toThrow("invalid result");
  });
  it("cancels oversized responses",async()=>{
    const cancel=vi.fn();vi.stubGlobal("fetch",vi.fn(async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(16_385));},cancel}))));
    await expect(createAuditWithLimits(input)).rejects.toThrow("byte limit");expect(cancel).toHaveBeenCalledOnce();
  });
  it("keeps its deadline active after headers",async()=>{
    const controller=new AbortController();vi.spyOn(AbortSignal,"timeout").mockReturnValue(controller.signal);
    const cancel=vi.fn();vi.stubGlobal("fetch",vi.fn(async()=>new Response(new ReadableStream({cancel}))));
    const work=createAuditWithLimits(input),outcome=expect(work).rejects.toMatchObject({name:"AbortError"});controller.abort();await outcome;expect(cancel).toHaveBeenCalled();
  });
});

describe("audit creation API",()=>{
  it.each([["free",5,1,null,0],["onetime",50,1,10,24],["pro",100,null,null,24],["agency",500,null,null,24]])("preserves the %s tier and ignores request overrides",async(plan,pages,monthly,rolling,hours)=>{
    auth.plan=plan as string;const fetch=vi.fn(async(_url:string,init?:RequestInit)=>init?.method==="POST"?Response.json({limit_reached:null,id:"audit-id"}):new Response("[]",{headers:{"content-range":"*/0"}}));vi.stubGlobal("fetch",fetch);
    const response=await POST(request({domain:"https://example.invalid",userId:"other",pageLimit:999,monthlyLimit:999}));expect(response.status).toBe(201);
    expect(await response.json()).toEqual({id:"audit-id",urls:targets});expect(discover).toHaveBeenCalledWith("https://example.invalid",pages);
    const [,init]=fetch.mock.calls.find(([,init])=>init?.method==="POST")!;
    expect(JSON.parse(init!.body as string)).toMatchObject({p_user_id:"owner",p_page_limit:pages,p_monthly_limit:monthly,p_rolling_limit:rolling,p_window_hours:hours});
  });
  it("preserves uncapped admin creation",async()=>{
    admin.mockReturnValue(true);const fetch=vi.fn(async(_url:string,_init?:RequestInit)=>Response.json({limit_reached:null,id:"audit-id"}));vi.stubGlobal("fetch",fetch);
    expect((await POST(request())).status).toBe(201);expect(fetch).toHaveBeenCalledOnce();
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toMatchObject({p_page_limit:500,p_monthly_limit:null,p_rolling_limit:null});
  });
  it.each([["free","monthly"],["onetime","monthly"],["onetime","rolling"]])("rejects a %s/%s limit reached after the early count",async(plan,window)=>{
    auth.plan=plan;const fetch=vi.fn(async(_url:string,init?:RequestInit)=>init?.method==="POST"?Response.json({limit_reached:window}):new Response("[]",{headers:{"content-range":"*/0"}}));vi.stubGlobal("fetch",fetch);
    expect((await POST(request())).status).toBe(429);expect(discover).toHaveBeenCalledOnce();
    expect(fetch.mock.calls.filter(([,init])=>init?.method==="POST")).toHaveLength(1);
  });
  it("fails closed on a missing RPC after discovery with no legacy insert",async()=>{
    const fetch=vi.fn(async(_url:string,init?:RequestInit)=>init?.method==="POST"?new Response("private payload",{status:404}):new Response("[]",{headers:{"content-range":"*/0"}}));vi.stubGlobal("fetch",fetch);
    const response=await POST(request());expect(response.status).toBe(503);expect(await response.text()).not.toContain("private payload");
    expect(fetch.mock.calls.filter(([,init])=>init?.method==="POST").map(([url])=>url)).toEqual(["https://db.test/rest/v1/rpc/create_audit_with_limits"]);
  });
  it("retains authentication and URL checks before discovery",async()=>{
    auth.user=null;const fetch=vi.fn(async()=>new Response("[]",{headers:{"content-range":"*/0"}}));vi.stubGlobal("fetch",fetch);
    expect((await POST(request())).status).toBe(401);expect(fetch).not.toHaveBeenCalled();
    auth.user={id:"owner",email:"owner@example.invalid"};safe.mockRejectedValue(new Error("Private address"));
    expect((await POST(request())).status).toBe(400);expect(discover).not.toHaveBeenCalled();
  });
});
