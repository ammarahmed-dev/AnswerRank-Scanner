export type ScoringComparison = "same_method" | "method_changed" | "unversioned";

/** An absent legacy version is unknown, not an implicit match to today's method. */
export function getScoringComparison(current: unknown, previous: unknown): ScoringComparison {
  if (typeof current !== "string" || !current.trim() || typeof previous !== "string" || !previous.trim()) {
    return "unversioned";
  }
  return current === previous ? "same_method" : "method_changed";
}
