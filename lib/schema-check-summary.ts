import type { SchemaCheckResult } from "@/lib/schema-check";

/** Coverage and syntax are independent; an empty error list cannot prove unrun checks passed. */
export function schemaCheckSummary(result: SchemaCheckResult): {
  tone: "bad" | "warn" | "good"; title: string; checked: number; unassessed: number;
} {
  const checked = result.entities.filter((entity) => entity.rulesChecked === true);
  const coverage = { checked: checked.length, unassessed: result.entities.length - checked.length };
  if (!result.blocks.length) return { ...coverage, tone: "warn", title: "No JSON-LD blocks found" };
  if (result.blocks.some((block) => !block.valid)) return { ...coverage, tone: "bad", title: "JSON-LD syntax errors found" };
  if (!result.entities.length) return { ...coverage, tone: "warn", title: "JSON parsed; no typed entities found" };
  if (!checked.length) return { ...coverage, tone: "warn", title: "Types detected; field checks unavailable" };
  if (checked.some((entity) => entity.missingRequired.length)) return { ...coverage, tone: "warn", title: "Checked fields need review" };
  if (coverage.unassessed) return { ...coverage, tone: "warn", title: "Checked fields present; some types unassessed" };
  return { ...coverage, tone: "good", title: "Checked fields present" };
}
