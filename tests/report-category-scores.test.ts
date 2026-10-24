import { describe, expect, it } from "vitest";
import { getReportCategoryScores, getScanCategoryScores, getResolvedReportCategoryScores } from "@/lib/report-category-scores";
import { createScoringMethodology } from "@/lib/scoring-policy";
import type { CheckResult } from "@/types/index";

const check = (id: string, status: CheckResult["status"]): CheckResult => ({ id, status, label: id, detail: "", weight: 1 });

describe("shared category measurements", () => {
  it("does not invent performance when PageSpeed is unavailable", () => {
    const checks = [check("core_web_vitals", "warn")];
    expect(getReportCategoryScores(checks, null)).toEqual([]);
    expect(getScanCategoryScores(checks, null).performance).toBeUndefined();
  });

  it("preserves actual performance including zero instead of averaging a status proxy", () => {
    for (const score of [0, 80, 100]) {
      const checks = [check("core_web_vitals", "pass")];
      expect(getReportCategoryScores(checks, { score })).toEqual([{ category: "performance", label: "Performance", score }]);
      expect(getScanCategoryScores(checks, { score }).performance).toBe(score);
    }
  });

  it("uses identical category membership and missing-schema guardrails for storage and display", () => {
    const checks = [check("schema_present", "fail"), check("faq_schema", "pass"), check("readability", "warn"), check("answer_headings", "pass")];
    const rows = getReportCategoryScores(checks, null);
    const stored = getScanCategoryScores(checks, null);
    expect(stored.schema).toBe(45);
    expect(stored.contentClarity).toBe(rows.find(r => r.category === "content")?.score);
    expect(stored.headings).toBe(100);
    expect(stored.aiReadiness).toBeUndefined();
  });
});

const methodology = createScoringMethodology({ pageSource: "html", requestedUrl: "https://example.test", resolvedUrl: "https://example.test", finalUrlVerified: true, pageSpeed: "unavailable" });

describe("historical category snapshots", () => {
  it("preserves a versioned category snapshot even when current checks would grade differently", () => {
    const rows = getResolvedReportCategoryScores({ methodology, checks: [check("title", "pass")], pagespeed: null, categoryScores: { metadata: 37, schema: 0 } });
    expect(rows).toEqual([
      { category: "schema", label: "Schema", score: 0 },
      { category: "metadata", label: "Metadata", score: 37 },
    ]);
  });
  it("does not reinterpret an unfamiliar future version using today's rules", () => {
    const rows = getResolvedReportCategoryScores({ methodology: { ...methodology, version: "future-policy" }, checks: [check("title", "fail")], pagespeed: { score: 80 }, categoryScores: { metadata: 91 } });
    expect(rows).toEqual([{ category: "metadata", label: "Metadata", score: 91 }]);
  });
  it("leaves missing or invalid versioned snapshot values unavailable", () => {
    const rows = getResolvedReportCategoryScores({ methodology, checks: [check("title", "pass")], pagespeed: null, categoryScores: { metadata: NaN, schema: 101, performance: -1 } });
    expect(rows).toEqual([]);
  });
  it("keeps the existing recalculation behavior for unversioned legacy reports", () => {
    const rows = getResolvedReportCategoryScores({ checks: [check("title", "pass")], pagespeed: null, categoryScores: { metadata: 37 } });
    expect(rows).toEqual([{ category: "metadata", label: "Metadata", score: 100 }]);
  });
});
