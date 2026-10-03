import type { ScanResult } from "@/types/index";

type Plan = "guest" | "free" | "onetime" | "pro" | "agency";

export type ReportViewer = {
  plan: Plan;
  isAdmin: boolean;
  /** Whether the viewer owns (created) the report. Report-level unlocks only apply to the owner. */
  isOwner: boolean;
};

/**
 * Whether a viewer may see the paid sections of a report. Mirrors the client check in
 * ReportSectionNew (canViewFullReport || unlocked || isFullReport) so the UI and API agree.
 * A report unlocked for its owner (onetime purchase) stays a preview for anyone it is shared with.
 */
export function hasFullReportAccess(report: ScanResult, viewer: ReportViewer): boolean {
  if (viewer.isAdmin) return true;
  if (viewer.plan === "pro" || viewer.plan === "agency") return true;
  return viewer.isOwner && Boolean(report.unlocked || report.unlockedAt || report.isFullReport);
}

/**
 * Removes the paid sections from a report for preview viewers: AI guidance beyond the summary
 * and schema analysis, and competitor scan results. Everything the free preview renders is kept.
 */
export function redactReport(report: ScanResult): ScanResult {
  return {
    ...report,
    aiInsights: report.aiInsights
      ? {
          ...report.aiInsights,
          recommendations: [],
          quickWin: "",
          contentGap: "",
        }
      : report.aiInsights,
    competitors: undefined,
    redacted: true,
  };
}

export function reportForViewer(report: ScanResult, viewer: ReportViewer): ScanResult {
  if (hasFullReportAccess(report, viewer)) return report;
  // Shared viewers must not inherit the owner's report-level unlock in the client either.
  return { ...redactReport(report), isFullReport: false, unlocked: false, unlockedAt: undefined };
}
