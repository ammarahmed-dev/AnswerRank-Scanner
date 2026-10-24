import { describe, expect, it } from "vitest";
import { createScoringMethodology } from "@/lib/scoring-policy";
import { calculateScore } from "@/lib/score-engine";

describe("scoring policy provenance", () => {
  it("isolates stored metadata from the live grading policy and later reports", () => {
    const evidence = { pageSource: "html" as const, requestedUrl: "https://example.test", finalUrlVerified: true, pageSpeed: "unavailable" as const };
    const first = createScoringMethodology(evidence);
    first.overall.statusCredit.warn = 0.99;
    first.categories.statusPoints.warn = 1;
    first.evidence.requestedUrl = "https://changed.test";
    const second = createScoringMethodology(evidence);
    expect(second.overall.statusCredit.warn).toBe(0.5);
    expect(second.categories.statusPoints.warn).toBe(60);
    expect(second.evidence.requestedUrl).toBe("https://example.test");
    expect(calculateScore([{ id: "title", label: "Title", status: "warn", detail: "Short title", weight: 1 }])).toBe(50);
  });
});
