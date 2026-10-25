import { getScoringComparison } from "@/lib/scoring-comparison";

export type HistorySnapshot = { score: number; scanned_at: string; methodology_version?: string | null };

/** Keep observations, but never draw a trend across unknown or changed methods. */
export function getMonitorHistorySegments(snapshots: HistorySnapshot[]): number[][] {
  const segments: number[][] = [];
  snapshots.forEach((snapshot, i) => {
    if (i > 0 && getScoringComparison(snapshot.methodology_version, snapshots[i - 1].methodology_version) === "same_method") {
      segments[segments.length - 1].push(i);
    } else {
      segments.push([i]);
    }
  });
  return segments;
}
