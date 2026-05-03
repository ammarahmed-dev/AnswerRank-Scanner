import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ScanResult } from "@/types/index";

type ReportRow = {
  id: string;
  url: string;
  result_json: string;
  created_at: string;
};

const dbDir = path.join(process.cwd(), "data");
const dbPath = path.join(dbDir, "answerrank.sqlite");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  const id = result.reportId ?? randomUUID();
  const report = { ...result, reportId: id };
  const createdAt = report.scannedAt || new Date().toISOString();

  getDb()
    .prepare(`
      INSERT OR REPLACE INTO reports (id, url, result_json, created_at)
      VALUES (?, ?, ?, ?)
    `)
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

function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

function supabaseHeaders() {
  return {
    apikey: supabaseServiceRoleKey ?? "",
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
  };
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
      result: report,
      created_at: createdAt,
    };
    const res = await fetch(`${supabaseUrl}/rest/v1/reports`, {
      method: "POST",
      headers: {
        ...supabaseHeaders(),
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
            ...supabaseHeaders(),
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
      select: "result",
      limit: "1",
    });

    const res = await fetch(`${supabaseUrl}/rest/v1/reports?${params.toString()}`, {
      headers: supabaseHeaders(),
      cache: "no-store",
    });

    if (!res.ok) {
      const details = await res.text().catch(() => "");
      console.error("Supabase report fetch failed:", details);
      return null;
    }

    const rows = (await res.json()) as Array<{ result?: ScanResult }>;
    return rows[0]?.result ?? getReport(id);
  }

  return getReport(id);
}
