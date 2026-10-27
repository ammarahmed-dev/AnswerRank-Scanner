import { describe, expect, it } from "vitest";
import { buildFixPack } from "@/lib/fix-pack";
import { getNormalizedIssues } from "@/lib/report-issues";
import { normalizeIssuesFromNormalized, recommendedFix, whyItMattersById } from "@/lib/report-view-model";
import type { CheckResult, ResourceDiagnostic } from "@/types/index";

const check=(id:string, diagnostic?:ResourceDiagnostic):CheckResult=>({id,label:id,status:"warn",detail:"Fixture",weight:1,diagnostic});
describe("resource guidance follows evidence",()=>{
  it.each(["blocked","http_error","unreachable","invalid_response","available"] as const)("does not offer resource-file starters for %s evidence",state=>{
    const checks=[check("robots",{state}),check("llms_txt",{state})];
    expect(buildFixPack({url:"https://fixture.invalid",checks}).filter(item=>["robots","llms-txt"].includes(item.id))).toEqual([]);
    expect(recommendedFix(checks[0])).toContain("retry before creating or replacing");
  });
  it("keeps optional starters for observed missing files and deliberate policy review",()=>{
    const checks=[check("robots",{state:"not_found",httpStatus:404}),check("llms_txt",{state:"not_found",httpStatus:404})];
    const items=buildFixPack({url:"https://fixture.invalid",checks});
    expect(items.map(i=>i.id)).toEqual(["robots","llms-txt"]);
    expect(items[0].placement).toContain("Preserve intentional private-path exclusions");
    expect(recommendedFix(checks[1])).toContain("optional");
  });
  it("preserves evidence through the actual issue/view-model normalization path",()=>{
    const rows=normalizeIssuesFromNormalized(getNormalizedIssues([
      check("robots",{state:"blocked",httpStatus:403}),check("llms_txt",{state:"not_found",httpStatus:404}),
    ],null));
    expect(rows[0].recommendedFix).toContain("retry before creating or replacing");
    expect(rows[1].recommendedFix).toContain("optional /llms.txt");
  });
  it("keeps old starter compatibility but does not infer missing legacy resources",()=>{
    const legacy=check("robots");
    expect(recommendedFix(legacy)).toContain("Verify the resource URL");
    expect(buildFixPack({url:"https://fixture.invalid",checks:[legacy]})[0].why).not.toContain("No robots.txt was found");
  });
  it("describes optional llms guidance and crawler access without citation guarantees",()=>{
    expect(whyItMattersById("llms_txt")).toContain("optional");
    expect(whyItMattersById("llms_txt")).not.toContain("significantly more accurate");
    expect(whyItMattersById("ai_bot_access")).toContain("does not prove");
    expect(whyItMattersById("robots")).toContain("voluntary");
    expect(recommendedFix(check("ai_bot_access"))).toContain("intend to permit");
  });
});
