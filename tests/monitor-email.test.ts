import { describe, expect, it } from "vitest";
import { buildMonitorEmail, categoryDrops, escapeHtml } from "@/lib/monitor-email";

const base = {
  name: "Example",
  url: "https://example.com/pricing",
  frequency: "weekly" as const,
  categoryScores: { schema: 60, metadata: 80 },
};

describe("monitor email", () => {
  it("sends a normal weekly summary when the score holds", () => {
    const { subject, isDropAlert, html } = buildMonitorEmail({ ...base, score: 70, previousScore: 68 });
    expect(subject).toBe("Your AEO score for Example this week");
    expect(isDropAlert).toBe(false);
    expect(html).toContain("+2 from last scan");
    expect(html).toContain("https://www.aeocheck.co/monitor");
  });

  it("uses the monthly subject for monthly monitors", () => {
    expect(buildMonitorEmail({ ...base, frequency: "monthly", score: 70, previousScore: null }).subject).toBe("Your AEO score for Example this month");
  });

  it("raises a drop alert at 5+ points with the biggest category drops", () => {
    const { subject, isDropAlert, html } = buildMonitorEmail({
      ...base,
      score: 62,
      previousScore: 70,
      categoryScores: { schema: 40, metadata: 80, headings: 70 },
      previousCategoryScores: { schema: 60, metadata: 85, headings: 70 },
    });
    expect(isDropAlert).toBe(true);
    expect(subject).toBe("Alert: your AEO score for Example dropped 8 points");
    expect(html).toContain("Biggest changes: Schema (-20), Metadata (-5)");
    expect(html).toContain("https://www.aeocheck.co/report?url=https%3A%2F%2Fexample.com%2Fpricing");
  });

  it("does not alert on a 4-point drop", () => {
    expect(buildMonitorEmail({ ...base, score: 66, previousScore: 70 }).isDropAlert).toBe(false);
  });

  it("escapes user-supplied monitor labels", () => {
    const { html } = buildMonitorEmail({ ...base, name: '<img src=x onerror="alert(1)">', score: 70, previousScore: null });
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x");
  });

  it("lists only categories that dropped, worst first", () => {
    expect(categoryDrops({ a: 50, b: 90, c: 10 }, { a: 60, b: 80, c: 40 }).map((d) => d.key)).toEqual(["c", "a"]);
    expect(categoryDrops({ a: 50 }, null)).toEqual([]);
    expect(escapeHtml(`"&'`)).toBe("&quot;&amp;&#39;");
  });
});
