import { CheckResult, ScanResult } from "@/types/index";
import { getResolvedReportCategoryScores, type ReportCategory } from "@/lib/report-category-scores";
import { getNormalizedIssues, type NormalizedIssue } from "@/lib/report-issues";

export type IssueSeverityLabel = "Critical" | "High" | "Nice to Have";

export function getIssueSeverityLabel(priority: NormalizedIssue["priority"]): IssueSeverityLabel {
  if (priority === "critical") return "Critical";
  if (priority === "high") return "High";
  return "Nice to Have";
}

function isOptionalSchemaCheck(id: string) {
  return id === "faq_schema" || id === "article_schema" || id === "structured_density";
}

export function getPassingChecks(report: Pick<ScanResult, "checks">): Array<{ id: string; label: string }> {
  const schemaMissing = report.checks.some((check) => check.id === "schema_present" && check.status === "fail");
  return report.checks
    .filter((check: CheckResult) => {
      if (check.status !== "pass") return false;
      if (schemaMissing && isOptionalSchemaCheck(check.id)) return false;
      return true;
    })
    .map((check: CheckResult) => ({ id: check.id, label: check.label }));
}

export type ReportPresentation = {
  scoreRows: Array<{ category: ReportCategory; score: number }>;
  issues: NormalizedIssue[];
  groupedIssues: {
    critical: NormalizedIssue[];
    high: NormalizedIssue[];
    nice: NormalizedIssue[];
  };
  counts: {
    critical: number;
    high: number;
    nice: number;
    totalIssues: number;
  };
  passingChecks: Array<{ id: string; label: string }>;
};

export function getReportPresentation(report: Pick<ScanResult, "checks" | "pagespeed" | "categoryScores">): ReportPresentation {
  const scoreRows = getResolvedReportCategoryScores(report);
  const issues = getNormalizedIssues(report.checks, report.pagespeed);
  const critical = issues.filter((issue) => issue.priority === "critical");
  const high = issues.filter((issue) => issue.priority === "high");
  const nice = issues.filter((issue) => issue.priority === "medium" || issue.priority === "low");
  const passingChecks = getPassingChecks(report);

  return {
    scoreRows,
    issues,
    groupedIssues: { critical, high, nice },
    counts: {
      critical: critical.length,
      high: high.length,
      nice: nice.length,
      totalIssues: issues.length,
    },
    passingChecks,
  };
}

