/**
 * Shape of a report in the /api/account list. Only fields the dashboard needs are returned: the
 * stored `result` holds the full report including paid sections, so it must never be sent here.
 */
export type AccountReportRow = {
  id: string;
  url: string;
  score: number;
  created_at: string;
  retest_count?: number;
  max_retests?: number;
  result?: {
    unlocked?: boolean;
    unlockedAt?: string;
    previous?: { score?: number };
  } | null;
};

export type AccountReport = {
  id: string;
  url: string;
  score: number;
  created_at: string;
  retest_count: number;
  max_retests: number;
  unlocked: boolean;
  /** Score of the user's earlier scan of the same URL, when this report was a rescan. */
  previousScore: number | null;
};

export function toAccountReport(row: AccountReportRow): AccountReport {
  const previous = row.result?.previous?.score;
  return {
    id: row.id,
    url: row.url,
    score: row.score,
    created_at: row.created_at,
    unlocked: Boolean(row.result?.unlocked || row.result?.unlockedAt),
    retest_count: typeof row.retest_count === "number" ? row.retest_count : 0,
    max_retests: typeof row.max_retests === "number" ? row.max_retests : 3,
    previousScore: typeof previous === "number" ? previous : null,
  };
}
