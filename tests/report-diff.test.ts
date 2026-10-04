import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { diffReports } from "@/lib/report-diff";
import type { CheckResult, PreviousScanSummary } from "@/types/index";

const check = (id: string, status: CheckResult["status"]): CheckResult => ({ id, label: id.toUpperCase(), status, detail: "", weight: 1 });
const previous: PreviousScanSummary = {
  reportId: "r0",
  score: 50,
  scannedAt: "2026-09-01T00:00:00Z",
  checks: [{ id: "title", label: "Title", status: "fail" }, { id: "meta", label: "Meta", status: "warn" }, { id: "h1", label: "H1", status: "pass" }, { id: "gone", label: "Gone", status: "fail" }],
};

describe("diffReports", () => {
  it("separates improved, regressed, unchanged and new checks and reports the score change", () => {
    const d = diffReports(61, [check("title", "pass"), check("meta", "warn"), check("h1", "warn"), check("new_check", "fail")], previous);
    expect(d.scoreDelta).toBe(11);
    expect(d.improved).toEqual([{ id: "title", label: "TITLE", from: "fail", to: "pass" }]);
    expect(d.regressed).toEqual([{ id: "h1", label: "H1", from: "pass", to: "warn" }]);
    expect(d.unchanged).toBe(1);
    expect(d.added).toBe(1);
    expect(d.previousScore).toBe(50);
  });

  it("reports a negative delta and ignores checks that disappeared", () => {
    const d = diffReports(40, [check("title", "fail")], previous);
    expect(d.scoreDelta).toBe(-10);
    expect(d.improved).toEqual([]);
    expect(d.unchanged).toBe(1);
  });
});

let getPrev: typeof import("@/lib/report-db").getPreviousReportSummary;

describe("getPreviousReportSummary", () => {
  beforeAll(async () => {
    process.env.SUPABASE_URL = "https://db.test";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    vi.resetModules();
    ({ getPreviousReportSummary: getPrev } = await import("@/lib/report-db"));
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("queries the user's latest report for the exact URL and keeps only score and statuses", async () => {
    let requested = "";
    vi.stubGlobal("fetch", async (url: string) => {
      requested = url;
      return new Response(JSON.stringify([{ id: "r9", created_at: "2026-09-02T00:00:00Z", result: { score: 71, scannedAt: "2026-09-02T00:00:01Z", aiInsights: { secret: "x" }, checks: [{ id: "title", label: "Title", status: "pass", detail: "long detail", weight: 8 }] } }]), { status: 200 });
    });
    const s = await getPrev("u 1", "https://a.test/");
    expect(requested).toContain("user_id=eq.u+1");
    expect(requested).toContain("url=eq.https%3A%2F%2Fa.test%2F");
    expect(requested).toContain("order=created_at.desc");
    expect(s).toEqual({ reportId: "r9", score: 71, scannedAt: "2026-09-02T00:00:01Z", checks: [{ id: "title", label: "Title", status: "pass" }] });
  });

  it("returns null for no user, no rows, bad rows, errors and network failures", async () => {
    expect(await getPrev("", "https://a.test/")).toBeNull();
    vi.stubGlobal("fetch", async () => new Response("[]", { status: 200 }));
    expect(await getPrev("u1", "https://a.test/")).toBeNull();
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify([{ id: "x", result: { checks: "nope" } }]), { status: 200 }));
    expect(await getPrev("u1", "https://a.test/")).toBeNull();
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 500 }));
    expect(await getPrev("u1", "https://a.test/")).toBeNull();
    vi.stubGlobal("fetch", async () => { throw new Error("down"); });
    expect(await getPrev("u1", "https://a.test/")).toBeNull();
  });
});
