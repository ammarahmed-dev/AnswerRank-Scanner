import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { safeFetch } = vi.hoisted(() => ({ safeFetch: vi.fn() }));
vi.mock("@/lib/url-safety", () => ({ safeFetch }));
import { checkRobotsTxt, checkSitemapXml, checkLlmsTxt } from "@/lib/resource-diagnostics";

const cases = [
  { name: "robots.txt", check: checkRobotsTxt, valid: "User-agent: *\nAllow: /", missing: "fail", limit: 2_500_000 },
  { name: "sitemap.xml", check: (url: string, signal?: AbortSignal) => checkSitemapXml(url, undefined, signal), valid: "<urlset></urlset>", missing: "fail", limit: 2_500_000 },
  { name: "llms.txt", check: checkLlmsTxt, valid: "# Example\n> Optional guidance", missing: "warn", limit: 500_000 },
];
beforeEach(() => { vi.resetAllMocks(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe.each(cases)("$name resource evidence", ({ name, check, valid, missing, limit }) => {
  it("records available content without changing existing pass credit", async () => {
    safeFetch.mockResolvedValue({ response: new Response(valid), finalUrl: `https://fixture.invalid/${name}` });
    expect(await check("https://fixture.invalid/page")).toMatchObject({ status: "pass", diagnostic: { state: "available", httpStatus: 200 } });
  });

  it.each([401,403,429,404,500,503,410])("distinguishes HTTP %s from transport failures and absence", async code => {
    const cancel = vi.fn();
    safeFetch.mockResolvedValue({ response: new Response(new ReadableStream({ cancel }), { status: code }), finalUrl: `https://fixture.invalid/${name}` });
    const result = await check("https://fixture.invalid/page");
    expect(result.status).toBe(code === 404 ? missing : "warn");
    expect(result.diagnostic).toEqual({ state: code === 404 ? "not_found" : [401,403,429].includes(code) ? "blocked" : "http_error", httpStatus: code });
    expect(result.detail).toContain(`HTTP ${code}`);
    if(code !== 404) expect(result.detail).toContain("absence is not established");
    expect(cancel).toHaveBeenCalled();
  });

  it("labels HTML soft errors as invalid responses, not missing files", async()=>{
    safeFetch.mockResolvedValue({ response: new Response("<!doctype html><html>Login required</html>", { headers: {"content-type":"text/plain"} }), finalUrl: "https://fixture.invalid/login" });
    const result=await check("https://fixture.invalid/page");
    expect(result).toMatchObject({status:"warn",diagnostic:{state:"invalid_response",httpStatus:200}});
    expect(result.detail).not.toContain("not found");
  });

  it("does not copy network/provider messages or infer missing content",async()=>{
    safeFetch.mockRejectedValue(new Error("private-url?token=secret-provider-error"));
    const result=await check("https://fixture.invalid/page");
    expect(result).toMatchObject({status:"warn",diagnostic:{state:"unreachable",reason:"fetch_failed"}});
    expect(result.detail).toContain("absence is not established");
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("times out headers without calling a missing file or retrying",async()=>{
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    safeFetch.mockImplementation((_url,init)=>{
      signal=init.signal;
      return new Promise((_resolve,reject)=>signal!.addEventListener("abort",()=>reject(signal!.reason),{once:true}));
    });
    const result=check("https://fixture.invalid/page");
    await vi.advanceTimersByTimeAsync(5000);
    expect(await result).toMatchObject({status:"warn",diagnostic:{state:"unreachable",reason:"timeout"}});
    expect(signal?.aborted).toBe(true);
    expect(safeFetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the deadline active through streamed-body consumption",async()=>{
    vi.useFakeTimers();
    const cancel=vi.fn();
    safeFetch.mockResolvedValue({response:new Response(new ReadableStream({cancel})),finalUrl:"https://fixture.invalid"});
    const result=check("https://fixture.invalid/page");
    await vi.advanceTimersByTimeAsync(4999);
    expect(cancel).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toMatchObject({status:"warn",diagnostic:{state:"unreachable",reason:"timeout"}});
    expect(cancel).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("classifies bounded-body rejection without treating it as absence",async()=>{
    const cancel=vi.fn();
    safeFetch.mockResolvedValue({response:new Response(new ReadableStream({cancel}),{headers:{"content-length":String(limit+1)}}),finalUrl:"https://fixture.invalid"});
    expect(await check("https://fixture.invalid/page")).toMatchObject({status:"warn",diagnostic:{state:"invalid_response",reason:"body_limit"}});
    expect(cancel).toHaveBeenCalled();
  });

  it("propagates caller cancellation instead of returning a diagnostic",async()=>{
    const controller=new AbortController();
    safeFetch.mockImplementation((_url,init)=>new Promise((_resolve,reject)=>init.signal.addEventListener("abort",()=>reject(init.signal.reason),{once:true})));
    const result=check("https://fixture.invalid/page",controller.signal);
    controller.abort(new Error("Caller cancelled"));
    await expect(result).rejects.toThrow("Caller cancelled");
  });
});

it("keeps origin/redirect/accept contracts and declared sitemap targeting",async()=>{
  safeFetch.mockImplementation(async(url:string)=>({response:new Response(url.endsWith("robots.txt")?"User-agent: *":"<urlset/>"),finalUrl:url}));
  await checkRobotsTxt("http://user:password@fixture.invalid:8080/path");
  await checkSitemapXml("http://fixture.invalid:8080/path","Sitemap: https://maps.invalid/custom.xml");
  await checkLlmsTxt("http://fixture.invalid:8080/path");
  expect(safeFetch.mock.calls.map(c=>c[0])).toEqual(["http://fixture.invalid:8080/robots.txt","https://maps.invalid/custom.xml","http://fixture.invalid:8080/llms.txt"]);
  expect(safeFetch.mock.calls.map(c=>c[1].maxRedirects)).toEqual([5,2,5]);
  expect(safeFetch.mock.calls[2][1].headers).not.toHaveProperty("Accept");
});
