import { afterEach, describe, expect, it, vi } from "vitest";
const { safeFetch }=vi.hoisted(()=>({safeFetch:vi.fn()}));
vi.mock("@/lib/url-safety",()=>({safeFetch,assertPublicUrl:vi.fn()}));
vi.mock("@/lib/pagespeed",()=>({getPageSpeedScore:vi.fn()}));
import { runScanCore } from "@/lib/scan-core";

// Snapshots captured from main before diagnostic classification was introduced.
// They pin scores/statuses for identical evidence, not copy the scoring formula.
const html='<html><head><title>Fixture product</title><meta name="description" content="A useful product for site owners."><link rel="canonical" href="https://fixture.invalid/page"></head><body><h1>Fixture product</h1><h2>How does it help?</h2><p>'+"Useful product facts and clear customer answers. ".repeat(50)+'</p></body></html>';
afterEach(()=>vi.clearAllMocks());
describe("resource diagnostics preserve scoring",()=>{
  it("preserves main's overall/category scores and resource check credit",async()=>{
    const observations=[];
    for(const scenario of ["available","missing","restricted","server-error","invalid","network","oversized"]){
      safeFetch.mockImplementation(async(url:string)=>{
        if(url==="https://fixture.invalid/page")return{response:new Response(html),finalUrl:url};
        if(scenario==="network")throw new Error("Fixture transport failure");
        const code=scenario==="missing"?404:scenario==="restricted"?403:scenario==="server-error"?503:200;
        const body=scenario==="invalid"?"<html>Login required</html>":url.endsWith("robots.txt")?"User-agent: *\nAllow: /":url.endsWith("sitemap.xml")?"<urlset/>":"# Fixture\n> Optional guidance";
        return{response:new Response(body,{status:code,headers:{"content-type":"text/plain",...(scenario==="oversized"?{"content-length":"2500001"}:{})}}),finalUrl:url};
      });
      const result=await runScanCore("https://fixture.invalid/page",{includePageSpeed:false});
      observations.push({scenario,score:result.score,categories:result.categoryScores,statuses:Object.fromEntries(result.checks.filter(c=>["robots","sitemap","llms_txt","ai_bot_access"].includes(c.id)).map(c=>[c.id,c.status])),version:result.methodology.version});
    }
    expect(observations).toMatchInlineSnapshot(`
      [
        {
          "categories": {
            "aiReadiness": 71,
            "contentClarity": 71,
            "headings": 100,
            "metadata": 54,
            "performance": undefined,
            "schema": 45,
            "trustSignals": 100,
          },
          "scenario": "available",
          "score": 63,
          "statuses": {
            "ai_bot_access": "pass",
            "llms_txt": "pass",
            "robots": "pass",
            "sitemap": "pass",
          },
          "version": "aeocheck-2026-10-24-v1",
        },
        {
          "categories": {
            "aiReadiness": 60,
            "contentClarity": 71,
            "headings": 100,
            "metadata": 54,
            "performance": undefined,
            "schema": 45,
            "trustSignals": 50,
          },
          "scenario": "missing",
          "score": 52,
          "statuses": {
            "ai_bot_access": "warn",
            "llms_txt": "warn",
            "robots": "fail",
            "sitemap": "fail",
          },
          "version": "aeocheck-2026-10-24-v1",
        },
        {
          "categories": {
            "aiReadiness": 60,
            "contentClarity": 71,
            "headings": 100,
            "metadata": 54,
            "performance": undefined,
            "schema": 45,
            "trustSignals": 73,
          },
          "scenario": "restricted",
          "score": 55,
          "statuses": {
            "ai_bot_access": "warn",
            "llms_txt": "warn",
            "robots": "warn",
            "sitemap": "warn",
          },
          "version": "aeocheck-2026-10-24-v1",
        },
        {
          "categories": {
            "aiReadiness": 60,
            "contentClarity": 71,
            "headings": 100,
            "metadata": 54,
            "performance": undefined,
            "schema": 45,
            "trustSignals": 73,
          },
          "scenario": "server-error",
          "score": 55,
          "statuses": {
            "ai_bot_access": "warn",
            "llms_txt": "warn",
            "robots": "warn",
            "sitemap": "warn",
          },
          "version": "aeocheck-2026-10-24-v1",
        },
        {
          "categories": {
            "aiReadiness": 60,
            "contentClarity": 71,
            "headings": 100,
            "metadata": 54,
            "performance": undefined,
            "schema": 45,
            "trustSignals": 73,
          },
          "scenario": "invalid",
          "score": 55,
          "statuses": {
            "ai_bot_access": "warn",
            "llms_txt": "warn",
            "robots": "warn",
            "sitemap": "warn",
          },
          "version": "aeocheck-2026-10-24-v1",
        },
        {
          "categories": {
            "aiReadiness": 60,
            "contentClarity": 71,
            "headings": 100,
            "metadata": 54,
            "performance": undefined,
            "schema": 45,
            "trustSignals": 73,
          },
          "scenario": "network",
          "score": 55,
          "statuses": {
            "ai_bot_access": "warn",
            "llms_txt": "warn",
            "robots": "warn",
            "sitemap": "warn",
          },
          "version": "aeocheck-2026-10-24-v1",
        },
        {
          "categories": {
            "aiReadiness": 60,
            "contentClarity": 71,
            "headings": 100,
            "metadata": 54,
            "performance": undefined,
            "schema": 45,
            "trustSignals": 73,
          },
          "scenario": "oversized",
          "score": 55,
          "statuses": {
            "ai_bot_access": "warn",
            "llms_txt": "warn",
            "robots": "warn",
            "sitemap": "warn",
          },
          "version": "aeocheck-2026-10-24-v1",
        },
      ]
    `);
  });
});
