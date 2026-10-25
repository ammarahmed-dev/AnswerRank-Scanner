import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import type {ScanResult,ScrapedData} from "@/types/index";
const {auth,scan,genericSave,commit,release,previous}=vi.hoisted(()=>({
  auth:{user:{id:"owner",email:"owner@example.invalid"},plan:"onetime",onetimeUrl:null as string|null,onetimeScanCount:0},
  scan:vi.fn(),genericSave:vi.fn(),commit:vi.fn(),release:vi.fn(),previous:vi.fn(),
}));
vi.mock("@/lib/auth-server",()=>({getAuthContext:async()=>auth}));
vi.mock("@/lib/scan-core",()=>({runScanCore:scan}));
vi.mock("@/lib/report-db",()=>({saveReportRecord:genericSave,getPreviousReportSummary:previous}));
vi.mock("@/lib/url-safety",()=>({assertPublicUrl:vi.fn()}));
vi.mock("@/lib/admin",()=>({isMasterAdmin:()=>false}));
vi.mock("@/lib/supabase-config",()=>({getSupabaseServerUrl:()=>"https://db.test",getSupabaseServiceHeaders:()=>({}),hasSupabaseConfig:()=>true}));
vi.mock("@/lib/usage-limits",()=>({reserveUsage:async()=>({allowed:true,reserved:true}),commitUsage:commit,releaseUsage:release,getPlanLimit:()=>10,getClientKey:()=>"fixture"}));
import {POST} from "@/app/api/scan/route";
const scrapedData={url:"https://example.invalid/",title:"Example",metaDescription:"Example",canonical:"",headings:["H1: Example"],schemaTypes:[],schemaBlocks:0,bodyText:"Useful content",images:[],internalLinks:0,wordCount:2,ogTitle:"",ogDescription:"",ogImage:"",source:"html"} satisfies ScrapedData;
const core={scrapedData,score:70,checks:[],pagespeed:null,pagespeedResult:null,categoryScores:{},metadata:{title:"Example"}};
const request=()=>new Request("https://aeocheck.co/api/scan",{method:"POST",body:JSON.stringify({url:"https://example.invalid/",includeAI:false})});
const events=async()=>{const response=await POST(request() as never);return(await response.text()).split("\n").filter(x=>x.startsWith("data: ")).map(x=>JSON.parse(x.slice(6)));};
beforeEach(()=>{
  vi.clearAllMocks();auth.plan="onetime";auth.onetimeUrl=null;auth.onetimeScanCount=0;
  previous.mockReset().mockResolvedValue(null);
  scan.mockReset().mockResolvedValue(core);genericSave.mockReset().mockImplementation(async(report:ScanResult)=>({...report,reportId:"generic"}));
  vi.spyOn(console,"error").mockImplementation(()=>undefined);
});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
describe("one-time scan persistence boundary",()=>{
  it("uses the atomic save and commits usage only after receiving the matching report ID",async()=>{
    const fetch=vi.fn(async(_url:string,init?:RequestInit)=>Response.json(JSON.parse(String(init?.body)).p_report_id));vi.stubGlobal("fetch",fetch);
    const rows=await events(),report=rows.find(e=>e.type==="result")?.result;
    expect(report.isFullReport).toBe(true);expect(fetch).toHaveBeenCalledOnce();expect(fetch.mock.calls[0][0]).toContain("/rpc/save_onetime_report");
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toMatchObject({p_user_id:"owner",p_report:{reportId:report.reportId,url:"https://example.invalid/",isFullReport:true}});
    expect(genericSave).not.toHaveBeenCalled();expect(commit).toHaveBeenCalledOnce();expect(release).not.toHaveBeenCalled();
  });
  it("finishes a dispatched atomic save and usage settlement after stream cancellation",async()=>{
    let resolveSave:((response:Response)=>void)|undefined;let id:string|undefined;
    const fetch=vi.fn(async(_url:string,init?:RequestInit)=>{id=JSON.parse(String(init?.body)).p_report_id;return new Promise<Response>(resolve=>{resolveSave=resolve;});});vi.stubGlobal("fetch",fetch);
    const response=await POST(request() as never);await vi.waitFor(()=>expect(fetch).toHaveBeenCalledOnce());expect(commit).not.toHaveBeenCalled();
    await response.body!.cancel();resolveSave!(Response.json(id));await vi.waitFor(()=>expect(commit).toHaveBeenCalledOnce());expect(release).not.toHaveBeenCalled();
  });
  it("does not begin persistence after cancellation during the previous-report read",async()=>{
    let finishRead:((value:null)=>void)|undefined;previous.mockImplementation(()=>new Promise(resolve=>{finishRead=resolve;}));
    const fetch=vi.fn();vi.stubGlobal("fetch",fetch);const response=await POST(request() as never);await vi.waitFor(()=>expect(previous).toHaveBeenCalledOnce());
    await response.body!.cancel();finishRead!(null);await vi.waitFor(()=>expect(release).toHaveBeenCalledOnce());expect(fetch).not.toHaveBeenCalled();expect(commit).not.toHaveBeenCalled();expect(genericSave).not.toHaveBeenCalled();
  });
  it("returns a stream error and releases usage on atomic-save failure without legacy writes",async()=>{
    const fetch=vi.fn(async()=>new Response(null,{status:503}));vi.stubGlobal("fetch",fetch);
    const rows=await events();expect(rows.some(e=>e.type==="result")).toBe(false);expect(rows.find(e=>e.type==="error")?.message).toContain("report history");
    expect(fetch).toHaveBeenCalledOnce();expect(genericSave).not.toHaveBeenCalled();expect(commit).not.toHaveBeenCalled();expect(release).toHaveBeenCalledOnce();
  });
  it("does not consume a one-time right when scanning fails",async()=>{
    scan.mockRejectedValue(new Error("Fixture failure"));const fetch=vi.fn();vi.stubGlobal("fetch",fetch);
    expect((await events()).some(e=>e.type==="result")).toBe(false);expect(fetch).not.toHaveBeenCalled();expect(genericSave).not.toHaveBeenCalled();expect(release).toHaveBeenCalledOnce();
  });
  it.each(["different URL","exhausted","subscriber"])("preserves generic saving for %s",async kind=>{
    if(kind==="different URL")auth.onetimeUrl="https://other.invalid/";
    if(kind==="exhausted"){auth.onetimeUrl="https://example.invalid/";auth.onetimeScanCount=4;}
    if(kind==="subscriber")auth.plan="pro";
    const fetch=vi.fn();vi.stubGlobal("fetch",fetch);const rows=await events(),report=rows.find(e=>e.type==="result")?.result;
    expect(report.reportId).toBe("generic");expect(report.isFullReport).toBe(kind==="subscriber");expect(genericSave).toHaveBeenCalledOnce();expect(fetch).not.toHaveBeenCalled();
  });
});
