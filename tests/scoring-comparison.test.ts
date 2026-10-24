import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getScoringComparison } from "@/lib/scoring-comparison";
import { diffReports } from "@/lib/report-diff";
import { toAccountReport } from "@/lib/account-reports";
import { createScoringMethodology } from "@/lib/scoring-policy";
import ReportChanges from "@/app/components/ReportChanges";
import type { ScanResult, PreviousScanSummary } from "@/types/index";

const methodology = createScoringMethodology({ requestedUrl: "https://example.test/", pageSource: "html", finalUrlVerified: true, pageSpeed: "unavailable" });
const previous: PreviousScanSummary = {
  score: 40, scannedAt: "2026-10-24T00:00:00Z", methodologyVersion: methodology.version,
  checks: [{ id: "title", label: "Title", status: "fail" }],
};
const report = {
  score: 80, url: "https://example.test/", scannedAt: "2026-10-25T00:00:00Z", methodology,
  checks: [{ id: "title", label: "Title", status: "pass", detail: "Present", weight: 1 }],
} as ScanResult;

describe("scoring-method compatibility", () => {
  it.each([
    ["v1", "v1", "same_method"], ["v2", "v1", "method_changed"],
    [undefined, "v1", "unversioned"], ["v1", undefined, "unversioned"],
    [undefined, undefined, "unversioned"], ["", "", "unversioned"],
    [" ", " ", "unversioned"], [null, null, "unversioned"], [1, 1, "unversioned"],
  ] as const)("classifies %s versus %s as %s", (current, earlier, expected) => {
    expect(getScoringComparison(current, earlier)).toBe(expected);
  });

  it.each(["different-method", undefined, ""])("does not interpret changes against an earlier method %s", earlier => {
    const diff = diffReports(report.score, report.checks, { ...previous, methodologyVersion: earlier }, methodology.version);
    expect(diff).toMatchObject({ scoreDelta: null, improved: [], regressed: [], unchanged: 0, added: 0, previousScore: 40 });
  });

  it("does not infer current methodology from a versioned previous report", () => {
    expect(diffReports(report.score, report.checks, previous).scoreDelta).toBeNull();
  });

  it("preserves same-method zero scores and negative deltas", () => {
    const diff = diffReports(0, report.checks, previous, methodology.version);
    expect(diff.scoreDelta).toBe(-40);
    expect(diff.improved).toHaveLength(1);
  });
});

describe("rendered report comparison", () => {
  it("retains same-method numeric and check changes", () => {
    const html = renderToStaticMarkup(createElement(ReportChanges, { report, previous }));
    expect(html).toContain("+40");
    expect(html).toContain("Checks Improved");
    expect(html).not.toContain("cannot be");
  });

  it.each(["different-method", undefined])("explains incompatible history %s without improvement/regression cards", earlier => {
    const html = renderToStaticMarkup(createElement(ReportChanges, { report, previous: { ...previous, methodologyVersion: earlier } }));
    expect(html).toContain(earlier ? "different scoring methods" : "not recorded");
    expect(html).toContain("new baseline");
    expect(html).toContain("40 out of 100");
    expect(html).not.toContain("Score Change");
    expect(html).not.toContain("Checks Improved");
    expect(html).not.toContain("Checks Worse");
    expect(html).not.toContain("+40");
  });

  it("handles an invalid prior date without displaying Invalid Date", () => {
    const html = renderToStaticMarkup(createElement(ReportChanges, { report, previous: { ...previous, scannedAt: "invalid", methodologyVersion: undefined } }));
    expect(html).not.toContain("Invalid Date");
    expect(html).toContain("earlier scan of this URL scored 40");
  });
});

describe("dashboard comparison boundary", () => {
  it.each(["different-method", undefined])("omits dashboard delta input for method %s", earlier => {
    const mapped = toAccountReport({ id: "r1", url: report.url, score: report.score, created_at: report.scannedAt, result: { methodology, previous: { score: 40, methodologyVersion: earlier } } });
    expect(mapped.previousScore).toBeNull();
    expect(mapped.score).toBe(80);
  });

  it("retains zero as a comparable previous score", () => {
    const mapped = toAccountReport({ id: "r1", url: report.url, score: 80, created_at: report.scannedAt, result: { methodology, previous: { score: 0, methodologyVersion: methodology.version } } });
    expect(mapped.previousScore).toBe(0);
    expect(mapped).not.toHaveProperty("result");
  });
});
