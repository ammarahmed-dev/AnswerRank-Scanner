import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";
import { ScanResult } from "@/types/index";

type ReportRow = {
  id: string;
  url: string;
  result_json: string;
  created_at: string;
};

const dbDir = path.join(process.cwd(), "data");
const dbPath = path.join(dbDir, "aeocheck.sqlite");
const supabaseUrl = getSupabaseServerUrl();

let db: DatabaseSync | null = null;

function getDb() {
  if (db) return db;

  mkdirSync(dbDir, { recursive: true });
  db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      result_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reports_url_created
      ON reports (url, created_at DESC);
  `);

  return db;
}

export function saveReport(result: ScanResult): ScanResult {
  if (process.env.NODE_ENV === "production") {
    console.warn("[report-db] Falling back to local SQLite — report will not persist across serverless invocations. Check Supabase config.");
  }
  const id = result.reportId ?? randomUUID();
  const report = { ...result, reportId: id };
  const createdAt = report.scannedAt || new Date().toISOString();

  getDb()
    .prepare("INSERT OR REPLACE INTO reports (id, url, result_json, created_at) VALUES (?, ?, ?, ?)")
    .run(id, report.url, JSON.stringify(report), createdAt);

  return report;
}

export function getReport(id: string): ScanResult | null {
  const row = getDb()
    .prepare("SELECT id, url, result_json, created_at FROM reports WHERE id = ?")
    .get(id) as ReportRow | undefined;

  if (!row) return null;

  try {
    return JSON.parse(row.result_json) as ScanResult;
  } catch {
    return null;
  }
}

export async function saveReportRecord(result: ScanResult, userId?: string | null): Promise<ScanResult> {
  const id = result.reportId ?? randomUUID();
  const report = { ...result, reportId: id };
  const createdAt = report.scannedAt || new Date().toISOString();

  if (hasSupabaseConfig()) {
    const payload = {
      id,
      user_id: userId ?? null,
      url: report.url,
      score: report.score,
      retest_count: typeof report.retest_count === "number" ? report.retest_count : 0,
      max_retests: typeof report.max_retests === "number" ? report.max_retests : 3,
      result: report,
      created_at: createdAt,
    };
    const res = await fetch(`${supabaseUrl}/rest/v1/reports`, {
      method: "POST",
      headers: {
        ...getSupabaseServiceHeaders(),
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const details = await res.text().catch(() => "");
      console.error("Supabase report save failed:", details);

      if (details.includes("user_id")) {
        const { user_id: _userId, ...legacyPayload } = payload;
        const legacyRes = await fetch(`${supabaseUrl}/rest/v1/reports`, {
          method: "POST",
          headers: {
            ...getSupabaseServiceHeaders(),
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify(legacyPayload),
        });

        if (legacyRes.ok) return report;

        const legacyDetails = await legacyRes.text().catch(() => "");
        console.error("Supabase legacy report save failed:", legacyDetails);
      }

      return saveReport(report);
    }

    return report;
  }

  return saveReport(report);
}

export async function getReportRecord(id: string): Promise<ScanResult | null> {
  if (hasSupabaseConfig()) {
    const params = new URLSearchParams({
      id: `eq.${id}`,
      select: "result,user_id,retest_count,max_retests",
      limit: "1",
    });

    const res = await fetch(`${supabaseUrl}/rest/v1/reports?${params.toString()}`, {
      headers: getSupabaseServiceHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      const details = await res.text().catch(() => "");
      console.error("Supabase report fetch failed:", details);
      return null;
    }

    const rows = (await res.json()) as Array<{ result?: ScanResult; user_id?: string | null; retest_count?: number; max_retests?: number }>;
    const row = rows[0];
    if (row?.result) {
      return {
        ...row.result,
        user_id: row.user_id ?? null,
        retest_count: typeof row.retest_count === "number" ? row.retest_count : row.result.retest_count ?? 0,
        max_retests: typeof row.max_retests === "number" ? row.max_retests : row.result.max_retests ?? 3,
      } as ScanResult;
    }
    return getReport(id);
  }

  return getReport(id);
}

export async function markReportUnlocked(reportId: string): Promise<boolean> {
  const unlockedAt = new Date().toISOString();

  if (hasSupabaseConfig()) {
    const params = new URLSearchParams({ id: `eq.${reportId}`, select: "id,result", limit: "1" });
    const readRes = await fetch(`${supabaseUrl}/rest/v1/reports?${params.toString()}`, {
      headers: getSupabaseServiceHeaders(),
      cache: "no-store",
    });

    if (readRes.ok) {
      const rows = (await readRes.json()) as Array<{ id: string; result?: ScanResult }>;
      const row = rows[0];
      if (row?.id) {
        const current = row.result ?? ({} as ScanResult);
        const nextResult: ScanResult = {
          ...current,
          reportId: current.reportId ?? reportId,
          retest_count: typeof current.retest_count === "number" ? current.retest_count : 0,
          max_retests: typeof current.max_retests === "number" ? current.max_retests : 3,
          unlocked: true,
          unlockedAt,
        };
        const patchRes = await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${encodeURIComponent(reportId)}`, {
          method: "PATCH",
          headers: { ...getSupabaseServiceHeaders(), Prefer: "return=minimal" },
          body: JSON.stringify({ result: nextResult, max_retests: nextResult.max_retests }),
        });
        if (patchRes.ok) return true;
        const details = await patchRes.text().catch(() => "");
        console.error("Supabase report unlock patch failed:", details);
      }
    } else {
      const details = await readRes.text().catch(() => "");
      console.error("Supabase report unlock read failed:", details);
    }
  }

  try {
    const local = getReport(reportId);
    if (!local) return false;
    const next: ScanResult = { ...local, unlocked: true, unlockedAt };
    getDb()
      .prepare("INSERT OR REPLACE INTO reports (id, url, result_json, created_at) VALUES (?, ?, ?, ?)")
      .run(reportId, next.url, JSON.stringify(next), next.scannedAt || unlockedAt);
    return true;
  } catch (err: unknown) {
    console.error("Local report unlock failed:", err instanceof Error ? err.message : "Unknown error");
    return false;
  }
}


