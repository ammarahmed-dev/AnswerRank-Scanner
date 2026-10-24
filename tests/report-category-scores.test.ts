import { describe, expect, it } from "vitest";
import { getReportCategoryScores, getScanCategoryScores } from "@/lib/report-category-scores";
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
