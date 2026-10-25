import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const { scanned } = vi.hoisted(() => ({ scanned: [] as string[] }));

vi.mock("@/lib/scan-core", () => ({
  runScanCore: async (url: string) => {
    scanned.push(url);
    if (url.includes("broken")) throw new Error("scan failed");
    return { score: 70, categoryScores: { schema: 60 } };
  },
}));

let GET: (req: Request) => Promise<Response>;
const snapshots: string[] = [];

beforeAll(async () => {
  process.env.SUPABASE_URL = "https://db.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  process.env.CRON_SECRET = "cron-secret";
  delete process.env.RESEND_API_KEY;
  ({ GET } = await import("@/app/api/cron/monitor-emails/route"));
});

afterEach(() => {
  scanned.length = 0;
  snapshots.length = 0;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const row = (id: string, url: string, frequency: string, last: string | null) => ({ id, url, label: null, user_id: "u1", frequency, last_scanned_at: last });

describe("monitor cron", () => {
  it("does not advance the schedule when saving a snapshot fails", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("/monitored_urls?") && !init?.method) {
        return new Response(JSON.stringify(url.includes("frequency=eq.weekly") ? [row("failed-save", "https://example.com/", "weekly", null)] : []));
      }
      if (init?.method === "POST") return new Response("unavailable", { status: 503 });
      return new Response("[]");
    });
    vi.stubGlobal("fetch", fetchMock);
    const response = await GET(new Request("https://www.aeocheck.co/api/cron/monitor-emails", { headers: { authorization: "Bearer cron-secret" } }));
    expect(await response.json()).toMatchObject({ processed: 0, errors: ["unexpected:https://example.com/"] });
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(false);
  });

  it("returns a retryable service error when the due query fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", async () => new Response("unavailable", { status: 503 }));
    const response = await GET(new Request("https://www.aeocheck.co/api/cron/monitor-emails", { headers: { authorization: "Bearer cron-secret" } }));
    expect(response.status).toBe(503);
  });

  it("rejects requests without the cron secret", async () => {
    const res = await GET(new Request("https://www.aeocheck.co/api/cron/monitor-emails"));
    expect(res.status).toBe(401);
  });

  it("scans due monitors oldest first, saves snapshots and survives failures", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      if (url.includes("/monitored_urls?") && !init?.method) {
        const weekly = url.includes("frequency=eq.weekly");
        expect(url).toContain("order=last_scanned_at.asc.nullsfirst");
        return new Response(JSON.stringify(weekly
          ? [row("w1", "https://new.com/", "weekly", null), row("w2", "https://broken.com/", "weekly", "2026-09-01T00:00:00Z")]
          : [row("m1", "https://old.com/", "monthly", "2026-08-01T00:00:00Z")]), { status: 200 });
      }
      if (url.includes("/rpc/save_monitor_snapshot") && init?.method === "POST") {
        snapshots.push(JSON.parse(String(init.body)).p_monitor_id);
        return Response.json([{ id: "snapshot", score: 70, scanned_at: "2026-10-25T00:00:00Z" }]);
      }
      return new Response("[]", { status: 200 });
    });

    const res = await GET(new Request("https://www.aeocheck.co/api/cron/monitor-emails", { headers: { authorization: "Bearer cron-secret" } }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ processed: 2, deferred: 0 });
    expect(body.errors).toEqual(["scan:https://broken.com/"]);
    expect(scanned.slice(0, 1)).toEqual(["https://new.com/"]); // never-scanned first, then oldest
    expect(snapshots.sort()).toEqual(["m1", "w1"]);
  });
});
