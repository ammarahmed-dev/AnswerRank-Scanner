import { CATEGORY_STATUS_POINTS, MISSING_SCHEMA_CATEGORY_CAP } from "@/lib/scoring-policy";
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
  return CATEGORY_STATUS_POINTS[status] ?? CATEGORY_STATUS_POINTS.fail;
}

export function mapReportCategory(id: string): ReportCategory {
  if (id.includes("schema")) return "schema";
  if (id === "title" || id === "meta_desc" || id === "canonical" || id.includes("og")) return "metadata";
  if (id.includes("heading") || id === "h1") return "headings";
  if (id === "https" || id === "robots" || id === "sitemap") return "trust";
  if (id === "core_web_vitals" || id.startsWith("cwv_")) return "performance";
  if (id === "word_count" || id === "internal_links" || id === "alt_text" || id === "readability") return "content";
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
    const category = mapReportCategory(check.id);
    // Performance comes only from the measurement, never a categorical proxy.
    if (category !== "performance") groups[category].push(scoreFromStatus(check.status));
  });

  if (typeof pagespeed?.score === "number") groups.performance.push(pagespeed.score);

  const schemaPresentCheck = checks.find((check) => check.id === "schema_present");
  const hasExplicitSchemaMissingSignal = checks.some((check) =>
    (check.id === "schema_present" || /schema markup/i.test(check.label)) &&
    check.status === "fail"
  ) || checks.some((check) => /no schema detected/i.test(check.detail));

  return (Object.entries(groups) as Array<[ReportCategory, number[]]>).filter(([, values]) => values.length > 0).map(([category, values]) => {
    let score = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

    // Guardrail: missing base schema should never look "Strong" just because optional schema checks are not applicable.
    if (category === "schema" && (schemaPresentCheck?.status === "fail" || hasExplicitSchemaMissingSignal)) {
      score = Math.min(score, MISSING_SCHEMA_CATEGORY_CAP);
    }

    return {
      category,
      label: REPORT_CATEGORY_LABELS[category],
      score,
    };
  });
}

export function getResolvedReportCategoryScores(report: Pick<ScanResult, "checks" | "pagespeed" | "categoryScores" | "methodology">) {
  // New reports carry a version and a stored snapshot. Never regrade them with a later policy.
  if (typeof report.methodology?.version === "string" && report.methodology.version.trim()) {
    const keys: Record<ReportCategory, keyof NonNullable<ScanResult["categoryScores"]>> = {
      schema: "schema", metadata: "metadata", content: "contentClarity", performance: "performance",
      trust: "trustSignals", "ai-readiness": "aiReadiness", headings: "headings",
    };
    return (Object.keys(REPORT_CATEGORY_LABELS) as ReportCategory[]).flatMap(category => {
      const score = report.categoryScores?.[keys[category]];
      // Invalid or absent historical values stay unavailable; do not invent a replacement.
      return typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100
        ? [{ category, label: REPORT_CATEGORY_LABELS[category], score }]
        : [];
    });
  }
  return getReportCategoryScores(report.checks, report.pagespeed);
}

/** Shared storage shape used by scans, comparisons, audits and monitoring. */
export function getScanCategoryScores(checks: ScanResult["checks"], pagespeed: ScanResult["pagespeed"]) {
  const rows = getReportCategoryScores(checks, pagespeed);
  const score = (category: ReportCategory) => rows.find((row) => row.category === category)?.score;
  return {
    metadata: score("metadata"), headings: score("headings"), schema: score("schema"),
    contentClarity: score("content"), aiReadiness: score("ai-readiness"),
    performance: score("performance"), trustSignals: score("trust"),
  };
}
