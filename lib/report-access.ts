import type { ScanResult } from "@/types/index";

type Plan = "guest" | "free" | "onetime" | "pro" | "agency";

/**
 * Whether a viewer may see the paid sections of a report. Mirrors the client check in
 * ReportSectionNew (canViewFullReport || unlocked || isFullReport) so the UI and API agree.
 */
export function hasFullReportAccess(report: ScanResult, viewer: { plan: Plan; isAdmin: boolean }): boolean {
  if (viewer.isAdmin) return true;
  if (viewer.plan === "pro" || viewer.plan === "agency") return true;
  return Boolean(report.unlocked || report.unlockedAt || report.isFullReport);
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

export function reportForViewer(report: ScanResult, viewer: { plan: Plan; isAdmin: boolean }): ScanResult {
  return hasFullReportAccess(report, viewer) ? report : redactReport(report);
}
