import { CheckResult, ScanResult } from "@/types/index";

export type ReportPriority = "critical" | "high" | "medium" | "low";

export type NormalizedIssue = {
  id: string;
  label: string;
  detail: string;
  status: CheckResult["status"];
  weight: number;
  priority: ReportPriority;
};

function priorityFromWeight(weight: number): ReportPriority {
  if (weight >= 10) return "critical";
  if (weight >= 7) return "high";
  if (weight >= 4) return "medium";
  return "low";
}

function makeIssue(check: CheckResult): NormalizedIssue {
  return {
    id: check.id,
    label: check.label,
    detail: check.detail,
    status: check.status,
    weight: check.weight,
    priority: priorityFromWeight(check.weight),
  };
}

function maybeSplitCoreWebVitals(
  issue: NormalizedIssue,
  pagespeed: ScanResult["pagespeed"]
): NormalizedIssue[] {
  if (issue.id !== "core_web_vitals" || issue.status === "pass") return [issue];
  if (!pagespeed) return [issue];

  const parts: NormalizedIssue[] = [];
  if (typeof pagespeed.lcp === "number" && pagespeed.lcp >= 2.5) {
    parts.push({
      id: "cwv_lcp",
      label: "Largest Contentful Paint",
      detail: `LCP is ${pagespeed.lcp}s. Target under 2.5s.`,
      status: pagespeed.lcp >= 4 ? "fail" : "warn",
      weight: issue.priority === "critical" ? 10 : 7,
      priority: issue.priority === "critical" ? "critical" : "high",
    });
  }
  if (typeof pagespeed.cls === "number" && pagespeed.cls >= 0.1) {
    parts.push({
      id: "cwv_cls",
      label: "Cumulative Layout Shift",
      detail: `CLS is ${pagespeed.cls}. Target under 0.1.`,
      status: pagespeed.cls >= 0.25 ? "fail" : "warn",
      weight: issue.priority === "critical" ? 10 : 7,
      priority: issue.priority === "critical" ? "critical" : "high",
    });
  }
  if (typeof pagespeed.fid === "number" && pagespeed.fid >= 200) {
    parts.push({
      id: "cwv_tbt",
      label: "Total Blocking Time",
      detail: `TBT is ${pagespeed.fid}ms. Target under 200ms.`,
      status: pagespeed.fid >= 600 ? "fail" : "warn",
      weight: issue.priority === "critical" ? 10 : 7,
      priority: issue.priority === "critical" ? "critical" : "high",
    });
  }

  return parts.length ? parts : [issue];
}

function maybeAddPageSpeedIssue(
  pagespeed: ScanResult["pagespeed"],
  existing: NormalizedIssue[]
): NormalizedIssue[] {
  if (!pagespeed || typeof pagespeed.score !== "number") return [];
  const hasPerformanceIssue = existing.some((issue) =>
    issue.id === "pagespeed_low" ||
    issue.id === "pagespeed_moderate" ||
    issue.id === "core_web_vitals" ||
    issue.id.startsWith("cwv_") ||
    issue.label.toLowerCase().includes("performance") ||
    issue.label.toLowerCase().includes("page speed")
  );
  if (hasPerformanceIssue) return [];

  if (pagespeed.score < 50) {
    return [{
      id: "pagespeed_low",
      label: "Poor mobile performance",
      detail: "The page has a low PageSpeed score, which may reduce user experience and crawl efficiency.",
      status: "fail",
      weight: 7,
      priority: "high",
    }];
  }
  if (pagespeed.score < 75) {
    return [{
      id: "pagespeed_moderate",
      label: "Performance needs improvement",
      detail: "The page has moderate performance issues based on the PageSpeed score.",
      status: "warn",
      weight: 4,
      priority: "medium",
    }];
  }
  return [];
}

export function getNormalizedIssues(checks: CheckResult[], pagespeed: ScanResult["pagespeed"]): NormalizedIssue[] {
  const base = checks
    .filter((check) => check.status !== "pass")
    .map(makeIssue)
    .flatMap((issue) => maybeSplitCoreWebVitals(issue, pagespeed));
  const perf = maybeAddPageSpeedIssue(pagespeed, base);
  return [...base, ...perf];
}

