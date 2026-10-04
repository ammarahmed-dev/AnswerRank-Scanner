import { describe, expect, it } from "vitest";
import { STUDY_SITES, computeStats, pct } from "@/lib/ai-readiness-study";

describe("ai readiness study data", () => {
  it("matches the 85 sites named in the page title", () => {
    expect(STUDY_SITES).toHaveLength(85);
    expect(new Set(STUDY_SITES.map((s) => s.domain)).size).toBe(85);
  });

  it("keeps blocked-crawler fields consistent", () => {
    for (const s of STUDY_SITES) {
      expect(s.blocksAnyAi).toBe(s.blocked.length > 0);
      expect(s.blocksGptbot).toBe(s.blocked.includes("gptbot"));
      if (!s.robotsReachable) expect(s.blocked).toEqual([]);
    }
  });

  it("computes stats over readable robots files only", () => {
    const stats = computeStats(STUDY_SITES);
    expect(stats.robotsChecked).toBe(STUDY_SITES.filter((s) => s.robotsReachable).length);
    expect(stats.blocksGptbot).toBeLessThanOrEqual(stats.robotsChecked);
    expect(pct(1, 4)).toBe(25);
    expect(pct(1, 0)).toBe(0);
  });
});
