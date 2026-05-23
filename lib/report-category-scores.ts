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
    groups[mapReportCategory(check.id)].push(scoreFromStatus(check.status));
  });

  if (typeof pagespeed?.score === "number") groups.performance.push(pagespeed.score);

  const schemaPresentCheck = checks.find((check) => check.id === "schema_present");
  const hasExplicitSchemaMissingSignal = checks.some((check) =>
    (check.id === "schema_present" || /schema markup/i.test(check.label)) &&
    check.status === "fail"
  ) || checks.some((check) => /no schema detected/i.test(check.detail));

  return (Object.entries(groups) as Array<[ReportCategory, number[]]>).map(([category, values]) => {
    let score = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

    // Guardrail: missing base schema should never look "Strong" just because optional schema checks are not applicable.
    if (category === "schema" && (schemaPresentCheck?.status === "fail" || hasExplicitSchemaMissingSignal)) {
      score = Math.min(score, 45);
    }

    return {
      category,
      label: REPORT_CATEGORY_LABELS[category],
      score,
    };
  });
}

function persistedScoreByCategory(scores: ScanResult["categoryScores"] | null | undefined): Partial<Record<ReportCategory, number>> {
  if (!scores) return {};
  const out: Partial<Record<ReportCategory, number>> = {};
  if (typeof scores.schema === "number") out.schema = scores.schema;
  if (typeof scores.metadata === "number") out.metadata = scores.metadata;
  if (typeof scores.contentClarity === "number") out.content = scores.contentClarity;
  if (typeof scores.performance === "number") out.performance = scores.performance;
  if (typeof scores.trustSignals === "number") out.trust = scores.trustSignals;
  if (typeof scores.aiReadiness === "number") out["ai-readiness"] = scores.aiReadiness;
  if (typeof scores.headings === "number") out.headings = scores.headings;
  return out;
}

export function getResolvedReportCategoryScores(report: Pick<ScanResult, "checks" | "pagespeed" | "categoryScores">) {
  const computed = getReportCategoryScores(report.checks, report.pagespeed);
  const persisted = persistedScoreByCategory(report.categoryScores);
  const hasPersisted = Object.keys(persisted).length > 0;
  if (!hasPersisted) return computed;

  const readabilityCheck = report.checks.find((check) => check.id === "readability");
  const persistedContent = persisted.content;
  const computedContent = computed.find((row) => row.category === "content")?.score;
  const staleContentClarity =
    typeof persistedContent === "number" &&
    typeof computedContent === "number" &&
    (readabilityCheck?.status === "warn" || readabilityCheck?.status === "fail") &&
    persistedContent > computedContent;

  // Keep persisted canonical values when valid, but automatically heal older
  // saved reports whose content score predates readability-cap logic.
  if (!staleContentClarity) {
    return computed.map((row) => ({
      ...row,
      score: typeof persisted[row.category] === "number" ? (persisted[row.category] as number) : row.score,
    }));
  }

  return computed.map((row) => {
    if (row.category === "content") return row;
    const persistedScore = persisted[row.category];
    return {
      ...row,
      score: typeof persistedScore === "number" ? persistedScore : row.score,
    };
  });
}
