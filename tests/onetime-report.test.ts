import {afterEach,describe,expect,it,vi} from "vitest";
import type {ScanResult} from "@/types/index";
vi.mock("@/lib/supabase-config",()=>({getSupabaseServerUrl:()=>"https://db.test",getSupabaseServiceHeaders:()=>({})}));
import {saveOnetimeReport} from "@/lib/onetime-report";
const result={url:"https://example.invalid/",score:0,checks:[],isFullReport:true,scannedAt:"2026-10-25T00:00:00Z",methodology:{version:"fixture"}} as unknown as ScanResult;
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
describe("atomic one-time report client",()=>{
  it("creates a report ID and accepts only that committed receipt",async()=>{
    const fetch=vi.fn(async(_url:string,init?:RequestInit)=>Response.json(JSON.parse(String(init?.body)).p_report_id));vi.stubGlobal("fetch",fetch);
    const saved=await saveOnetimeReport(result,"owner");expect(saved.reportId).toMatch(/^[0-9a-f-]{36}$/);expect(saved.url).toBe(result.url);
    expect(fetch).toHaveBeenCalledOnce();expect(fetch.mock.calls[0][0]).toBe("https://db.test/rest/v1/rpc/save_onetime_report");
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({p_user_id:"owner",p_report_id:saved.reportId,p_report:saved});
  });
  it.each([404,409,503])("fails closed on HTTP %s without separate writes",async status=>{
    const cancel=vi.fn(),fetch=vi.fn(async()=>new Response(new ReadableStream({cancel}),{status}));vi.stubGlobal("fetch",fetch);
    await expect(saveOnetimeReport(result,"owner")).rejects.toThrow("report history");expect(fetch).toHaveBeenCalledOnce();expect(cancel).toHaveBeenCalledOnce();
  });
  it.each([null,true,{},[],"wrong-id"])("rejects an invalid success receipt %j",async receipt=>{
    vi.stubGlobal("fetch",vi.fn(async()=>Response.json(receipt)));await expect(saveOnetimeReport(result,"owner")).rejects.toThrow("report history");
  });
  it("cancels oversized bodies",async()=>{
    const cancel=vi.fn();vi.stubGlobal("fetch",vi.fn(async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(16_385));},cancel}))));
    await expect(saveOnetimeReport(result,"owner")).rejects.toThrow("report history");expect(cancel).toHaveBeenCalledOnce();
  });
  it("keeps the deadline active through body reads",async()=>{
    const controller=new AbortController();vi.spyOn(AbortSignal,"timeout").mockReturnValue(controller.signal);
    const cancel=vi.fn();vi.stubGlobal("fetch",vi.fn(async()=>new Response(new ReadableStream({cancel}))));
    const work=saveOnetimeReport(result,"owner"),outcome=expect(work).rejects.toMatchObject({name:"OnetimeReportSaveError"});controller.abort();await outcome;expect(cancel).toHaveBeenCalled();
  });
});
