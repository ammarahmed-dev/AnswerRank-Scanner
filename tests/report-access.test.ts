import { describe, expect, it } from "vitest";
import { hasFullReportAccess, redactReport, reportForViewer } from "@/lib/report-access";
import type { ScanResult } from "@/types/index";

const report: ScanResult = {
  url: "https://example.com/",
  score: 61,
  checks: [{ id: "title", label: "Title", status: "pass", detail: "ok" }] as ScanResult["checks"],
  categoryScores: { metadata: 80 },
  aiInsights: {
    summary: "Example is an analytics product.",
    recommendations: ["Add FAQ schema"],
    quickWin: "Add an FAQ block",
    contentGap: "No pricing context",
    schemaRecommendations: { detected: ["Organization"], missing: ["FAQPage"], priority: "FAQPage", reasoning: "FAQ content" },
  },
  pagespeed: null,
  competitorUrls: ["https://rival.com/"],
  competitors: [{ url: "https://rival.com/", score: 70 }],
  scannedAt: "2026-10-03T00:00:00Z",
};

describe("report access", () => {
  it("grants full access to pro, agency, admins and unlocked/full reports", () => {
    expect(hasFullReportAccess(report, { plan: "pro", isAdmin: false, isOwner: true })).toBe(true);
    expect(hasFullReportAccess(report, { plan: "agency", isAdmin: false, isOwner: true })).toBe(true);
    expect(hasFullReportAccess(report, { plan: "guest", isAdmin: true, isOwner: false })).toBe(true);
    expect(hasFullReportAccess({ ...report, isFullReport: true }, { plan: "onetime", isAdmin: false, isOwner: true })).toBe(true);
    expect(hasFullReportAccess({ ...report, unlocked: true }, { plan: "free", isAdmin: false, isOwner: true })).toBe(true);
  });

  it("denies guests, free users and onetime users on other reports", () => {
    expect(hasFullReportAccess(report, { plan: "guest", isAdmin: false, isOwner: true })).toBe(false);
    expect(hasFullReportAccess(report, { plan: "free", isAdmin: false, isOwner: true })).toBe(false);
    expect(hasFullReportAccess({ ...report, isFullReport: false }, { plan: "onetime", isAdmin: false, isOwner: true })).toBe(false);
  });

  it("redacts paid sections but keeps what the preview renders", () => {
    const r = redactReport(report);
    expect(r.redacted).toBe(true);
    expect(r.competitors).toBeUndefined();
    expect(r.aiInsights).toMatchObject({ recommendations: [], quickWin: "", contentGap: "" });
    expect(r.aiInsights?.summary).toBe(report.aiInsights?.summary);
    expect(r.aiInsights?.schemaRecommendations).toEqual(report.aiInsights?.schemaRecommendations);
    expect(r.checks).toEqual(report.checks);
    expect(r.score).toBe(report.score);
    expect(r.categoryScores).toEqual(report.categoryScores);
    expect(r.competitorUrls).toEqual(report.competitorUrls);
  });

  it("does not mutate the stored report", () => {
    reportForViewer(report, { plan: "free", isAdmin: false, isOwner: true });
    expect(report.competitors).toHaveLength(1);
    expect(report.aiInsights?.quickWin).toBe("Add an FAQ block");
  });

  it("never extends the owner's report-level unlock to shared viewers", () => {
    const unlocked = { ...report, isFullReport: true, unlocked: true };
    expect(hasFullReportAccess(unlocked, { plan: "guest", isAdmin: false, isOwner: false })).toBe(false);
    const shared = reportForViewer(unlocked, { plan: "free", isAdmin: false, isOwner: false });
    expect(shared).toMatchObject({ redacted: true, isFullReport: false, unlocked: false });
    expect(shared.competitors).toBeUndefined();
    expect(reportForViewer(unlocked, { plan: "pro", isAdmin: false, isOwner: false })).toBe(unlocked);
  });

  it("returns the report unchanged for full-access viewers", () => {
    expect(reportForViewer(report, { plan: "pro", isAdmin: false, isOwner: true })).toBe(report);
  });
});
