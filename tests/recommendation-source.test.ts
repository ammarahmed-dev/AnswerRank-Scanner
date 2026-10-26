import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RecommendationSource from "@/app/components/RecommendationSource";
import { SAMPLE_REPORT } from "@/lib/sample-report";
import { reportForViewer } from "@/lib/report-access";
import type { AIInsights } from "@/types/index";

const generated: AIInsights = { ...SAMPLE_REPORT.aiInsights!, provenance: {
  kind: "provider_generated", provider: "OpenRouter", requestedModel: "openrouter/free",
  responseModel: "vendor/model-v2", generatedAt: "2026-10-25T10:15:00.000Z",
} };
const render = (insights?: AIInsights | null) => renderToStaticMarkup(createElement(RecommendationSource, { insights }));
describe("Recommendation source disclosure", () => {
  it("distinguishes requested and provider-reported models, retaining original UTC generation time", () => {
    const html = render(generated);
    expect(html).toContain("AI-generated guidance with rule-based checks");
    expect(html).toContain("Requested model: openrouter/free");
    expect(html).toContain("Provider-reported model: vendor/model-v2");
    expect(html).toContain('dateTime="2026-10-25T10:15:00.000Z"');
    expect(html).toContain("2026-10-25 10:15:00 UTC");
    expect(html).toContain("not independently verified");
    expect(html).toContain("not an observed answer or citation");
  });
  it("does not invent a provider or generation time for legacy/sample insights", () => {
    expect(render(SAMPLE_REPORT.aiInsights)).toContain("Analysis source unavailable");
    expect(render(SAMPLE_REPORT.aiInsights)).not.toContain("<time");
  });
  it.each([undefined, null])("labels absent insights as local rule-based guidance", insights => {
    expect(render(insights)).toContain("Local rule-based guidance");
    expect(render(insights)).not.toContain("Provider:");
  });
  it.each([{ generatedAt: "invalid" }, { provider: "Unrecorded" }, { kind: "unknown" }])("degrades malformed saved provenance to unknown: %j", patch => {
    expect(render({ ...generated, provenance: { ...generated.provenance, ...patch } } as AIInsights)).toContain("Analysis source unavailable");
  });
  it("omits unsafe saved model values and explains missing model metadata", () => {
    const html = render({ ...generated, provenance: { ...generated.provenance!, requestedModel: "secret?token=private", responseModel: undefined } });
    expect(html).not.toContain("secret");
    expect(html).toContain("Requested model: Not recorded");
    expect(html).toContain("Provider-reported model: Not supplied");
  });
  it("preserves source context while shared preview guidance stays redacted", () => {
    const preview = reportForViewer({ ...SAMPLE_REPORT, aiInsights: generated, unlocked: true }, { isOwner: false, isAdmin: false, plan: "free" });
    expect(preview).toMatchObject({ redacted: true, unlocked: false, isFullReport: false });
    expect(preview.aiInsights).toMatchObject({ recommendations: [], quickWin: "", contentGap: "", provenance: generated.provenance });
    expect(render(preview.aiInsights)).toContain("2026-10-25 10:15:00 UTC");
  });
});
