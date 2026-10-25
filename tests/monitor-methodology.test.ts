import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMonitorHistorySegments, type HistorySnapshot } from "@/lib/monitor-history";
import { buildMonitorEmail } from "@/lib/monitor-email";
import MonitorScoreHistory from "@/app/monitor/MonitorScoreHistory";

const { scan, send, auth } = vi.hoisted(() => ({
  scan: vi.fn(async () => ({ score: 0, categoryScores: { metadata: 0 }, methodology: { version: "v1" } })),
  send: vi.fn(async (_input: { subject: string; html: string }) => ({ data: { id: "mock-email" }, error: null })),
  auth: vi.fn(async () => ({ user: { id: "owner", email: "owner@example.invalid" }, plan: "pro" })),
}));
vi.mock("@/lib/auth-server", () => ({ getAuthContext: auth }));
vi.mock("@/lib/supabase-config", () => ({ getSupabaseServerUrl: () => "https://db.test", hasSupabaseConfig: () => true, getSupabaseServiceHeaders: () => ({}) }));
vi.mock("@/lib/scan-core", () => ({ runScanCore: scan }));
vi.mock("@/lib/admin", () => ({ isMasterAdmin: () => false }));
vi.mock("resend", () => ({ Resend: class { emails = { send }; } }));
import { GET as list } from "@/app/api/monitor/route";
import { GET as history } from "@/app/api/monitor/[id]/history/route";
import { POST as manualScan } from "@/app/api/monitor/[id]/scan/route";
import { GET as cron } from "@/app/api/cron/monitor-emails/route";

const snapshot = (version?: string | null, score = 60): HistorySnapshot => ({ score, methodology_version: version, scanned_at: "2026-10-25T00:00:00Z" });
const request = () => new Request("https://aeocheck.co/api/test", { headers: { authorization: "Bearer cron-test" } });
const ctx = () => ({ params: Promise.resolve({ id: "monitor-id" }) });
beforeEach(() => { vi.stubEnv("CRON_SECRET", "cron-test"); vi.stubEnv("RESEND_API_KEY", "mock-email-key"); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("monitor history segments", () => {
  it.each([
    [[], []], [["v1", "v1"], [[0, 1]]],
    [["v1", "v1", "v2", "v2", "v1"], [[0, 1], [2, 3], [4]]],
    [[undefined, undefined, "v1", "v1"], [[0], [1], [2, 3]]],
  ] as const)("keeps adjacent compatible observations together: %j", (versions, expected) => {
    expect(getMonitorHistorySegments(versions.map(v => snapshot(v)))).toEqual(expected);
  });
  it("renders legacy observations as neutral points without a connecting line", () => {
    const html = renderToStaticMarkup(createElement(MonitorScoreHistory, { snapshots: [snapshot(undefined), snapshot(null, 0)] }));
    expect(html).not.toContain("<polyline");
    expect(html.match(/<circle/g)).toHaveLength(4);
    expect(html).toContain("#94a3b8");
    expect(html).toContain("Scoring methods differ or are unknown");
  });
  it("renders separate same-method line segments without connecting across changes", () => {
    const html = renderToStaticMarkup(createElement(MonitorScoreHistory, { snapshots: [snapshot("v1", 0), snapshot("v1", 50), snapshot("v2", 20), snapshot("v2", 30)] }));
    expect(html.match(/<polyline/g)).toHaveLength(2);
    expect(html.match(/<circle/g)).toHaveLength(8);
  });
});

describe("monitor email method guard", () => {
  it.each([["v2", "v1"], ["v1", undefined], [undefined, undefined]] as const)("suppresses alerts and category deltas across %s/%s", (current, previous) => {
    const mail = buildMonitorEmail({ name: "Example", url: "https://example.invalid", frequency: "weekly", score: 0, previousScore: 90, categoryScores: { metadata: 0 }, previousCategoryScores: { metadata: 100 }, methodologyVersion: current, previousMethodologyVersion: previous });
    expect(mail.isDropAlert).toBe(false);
    expect(mail.subject).not.toContain("Alert");
    expect(mail.html).toContain("New baseline");
    expect(mail.html).not.toContain("-90 from last scan");
    expect(mail.html).not.toContain("(-100)");
    expect(mail.html).not.toContain("First scan");
  });
});

describe("monitor API method propagation", () => {
  it.each([["v1", "v1", -60], ["v2", "v1", null], [undefined, undefined, null]] as const)("guards list deltas for %s/%s", async (current, previous, delta) => {
    const fetch = vi.fn(async (_url: string) => Response.json([{ id: "monitor-id", monitor_snapshots: [snapshot(current, 0), snapshot(previous)] }]));
    vi.stubGlobal("fetch", fetch);
    const response = await list(request());
    expect(response.status).toBe(200);
    expect((await response.json()).items[0]).toMatchObject({ latest_score: 0, previous_score: 60, score_delta: delta });
    expect(decodeURIComponent(fetch.mock.calls[0][0])).toContain("methodology_version");
    expect(decodeURIComponent(fetch.mock.calls[0][0])).toContain("user_id=eq.owner");
  });
  it("returns history versions chronologically after verifying the owner", async () => {
    const fetch = vi.fn(async (url: string) => Response.json(url.includes("/monitored_urls") ? [{ id: "monitor-id" }] : [{ id: "new", ...snapshot("v1") }, { id: "legacy", ...snapshot(undefined) }]));
    vi.stubGlobal("fetch", fetch);
    const response = await history(request(), ctx());
    expect((await response.json()).snapshots.map((s: { id: string }) => s.id)).toEqual(["legacy", "new"]);
    expect(fetch.mock.calls[0][0]).toContain("user_id=eq.owner");
    expect(decodeURIComponent(fetch.mock.calls[1][0])).toContain("methodology_version");
  });
  it("writes the producing method on a manual snapshot, including a valid zero score", async () => {
    const fetch = vi.fn(async (url: string, init?: RequestInit) => Response.json(init?.method === "POST" ? [{ id: "snapshot", score: 0 }] : url.includes("/monitored_urls") && !init?.method ? [{ id: "monitor-id", url: "https://example.invalid" }] : []));
    vi.stubGlobal("fetch", fetch);
    const response = await manualScan(request(), ctx());
    expect(response.status).toBe(201);
    const body = JSON.parse(fetch.mock.calls.find(([, init]) => init?.method === "POST")![1]!.body as string);
    expect(body).toMatchObject({ methodology_version: "v1", score: 0, category_scores: { metadata: 0 } });
    expect(fetch.mock.calls[0][0]).toContain("user_id=eq.owner");
  });
  it.each(["v1", "v2", undefined])("cron writes the scan version and protects email comparisons against %s", async previous => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/monitored_urls?") && !init?.method) return Response.json(url.includes("frequency=eq.weekly") ? [{ id: "monitor-id", url: "https://example.invalid", user_id: "owner", frequency: "weekly" }] : []);
      if (url.includes("/monitor_snapshots?") && !init?.method) return Response.json([{ ...snapshot(previous, 90), category_scores: { metadata: 100 } }]);
      if (url.includes("/auth/v1/")) return Response.json({ email: "owner@example.invalid" });
      return new Response(null, { status: 201 });
    });
    vi.stubGlobal("fetch", fetch);
    expect((await cron(request())).status).toBe(200);
    const body = JSON.parse(fetch.mock.calls.find(([, init]) => init?.method === "POST")![1]!.body as string);
    expect(body.methodology_version).toBe("v1");
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0].subject.startsWith("Alert")).toBe(previous === "v1");
  });
});
