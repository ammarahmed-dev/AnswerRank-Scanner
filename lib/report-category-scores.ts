import { CheckResult, ScanResult } from "@/types/index";

export type ReportCategory =
  | "schema"
  | "metadata"
  | "content"
  | "performance"
  | "trust"
  | "ai-readiness"
  | "headings";

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  schema: "Schema",
  metadata: "Metadata",
  content: "Content Clarity",
  performance: "Performance",
  trust: "Trust Signals",
  "ai-readiness": "AI Readiness",
  headings: "Headings",
};

function scoreFromStatus(status: CheckResult["status"]): number {
  if (status === "pass") return 100;
  if (status === "warn") return 60;
  return 25;
}

export function mapReportCategory(id: string): ReportCategory {
  if (id.includes("schema")) return "schema";
  if (id === "title" || id === "meta_desc" || id.includes("og")) return "metadata";
  if (id.includes("heading") || id === "h1") return "headings";
  if (id === "https" || id === "robots" || id === "sitemap") return "trust";
  if (id === "core_web_vitals" || id.startsWith("cwv_")) return "performance";
  if (id === "word_count" || id === "internal_links" || id === "alt_text") return "content";
  return "ai-readiness";
}

export function getReportCategoryScores(
  checks: ScanResult["checks"],
  pagespeed: ScanResult["pagespeed"]
) {
  const groups: Record<ReportCategory, number[]> = {
    schema: [],
    metadata: [],
    content: [],
    performance: [],
    trust: [],
    "ai-readiness": [],
    headings: [],
  };

  checks.forEach((check) => {
    groups[mapReportCategory(check.id)].push(scoreFromStatus(check.status));
  });

  if (typeof pagespeed?.score === "number") groups.performance.push(pagespeed.score);

  const schemaPresentCheck = checks.find((check) => check.id === "schema_present");

  return (Object.entries(groups) as Array<[ReportCategory, number[]]>).map(([category, values]) => {
    let score = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

    // Guardrail: missing base schema should never look "Strong" just because optional schema checks are not applicable.
    if (category === "schema" && schemaPresentCheck?.status === "fail") {
      score = Math.min(score, 45);
    }

    return {
      category,
      label: REPORT_CATEGORY_LABELS[category],
      score,
    };
  });
}
