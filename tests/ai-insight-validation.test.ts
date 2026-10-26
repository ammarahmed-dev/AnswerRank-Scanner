import { describe, expect, it } from "vitest";
import { parseValidatedAIInsights } from "@/lib/ai-insight-validation";
const valid = { recommendations: ["Clarify the product heading."], quickWin: "Review the heading.", contentGap: "Add supported product details.", summary: "Review the missing signals.", schemaRecommendations: { detected: ["Invented"], missing: ["Product"], priority: "Product", reasoning: "Product facts are present." } };
const parse = (value: unknown) => parseValidatedAIInsights(JSON.stringify(value));
describe("AI insight response boundary", () => {
  it("accepts a bounded response but drops extra fields and claimed detections", () => {
    const result = parse({ ...valid, secret: "not report data" });
    expect(result?.recommendations).toEqual(valid.recommendations);
    expect(result?.schemaRecommendations?.detected).toEqual([]);
    expect(result).not.toHaveProperty("secret");
  });
  it("accepts a complete JSON fence and optional absent schema", () => {
    expect(parseValidatedAIInsights('```json\n'+JSON.stringify(valid)+'\n```')).not.toBeNull();
    expect(parse({ ...valid, schemaRecommendations: undefined })).not.toBeNull();
  });
  it.each([null, [], {}, "provider error", { ...valid, summary: 42 }, { ...valid, quickWin: " " }, { ...valid, recommendations: [null] }, { ...valid, schemaRecommendations: [] }, { ...valid, schemaRecommendations: { ...valid.schemaRecommendations, missing: [7] } }])("rejects malformed fields and roots: %j", value => { expect(parse(value)).toBeNull(); });
  it("does not salvage raw errors or embedded objects into user-facing summaries", () => {
    for (const raw of ["provider-error-secret", "prefix "+JSON.stringify(valid), JSON.stringify(valid)+" extra", '{"summary":']) expect(parseValidatedAIInsights(raw)).toBeNull();
  });
  it("bounds response, array counts and individual fields", () => {
    expect(parseValidatedAIInsights(" ".repeat(32769))).toBeNull();
    for (const value of [{ ...valid, recommendations: Array(6).fill("fix") }, { ...valid, summary: "x".repeat(1201) }, { ...valid, contentGap: "x".repeat(801) }, { ...valid, schemaRecommendations: { ...valid.schemaRecommendations, missing: Array(11).fill("Product") } }]) expect(parse(value)).toBeNull();
  });
});
