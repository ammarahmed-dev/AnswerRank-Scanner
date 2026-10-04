import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const { sent } = vi.hoisted(() => ({ sent: [] as Array<{ to: string; subject: string; html: string }> }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: async (msg: { to: string; subject: string; html: string }) => { sent.push(msg); return { id: "e1" }; } };
  },
}));

let maybeSend: (u: { id: string; email?: string }, limit: number, now?: Date) => Promise<boolean>;
const user = { id: "u1", email: "a@b.co" };
const now = new Date("2026-10-15T12:00:00Z");

beforeAll(async () => {
  process.env.SUPABASE_URL = "https://db.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  vi.resetModules();
  ({ maybeSendLimitReachedEmail: maybeSend } = await import("@/lib/limit-email"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  sent.length = 0;
  delete process.env.RESEND_API_KEY;
});

function mockPatch(status: number, rows: unknown[] = []) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    calls.push(url);
    return new Response(status < 300 ? JSON.stringify(rows) : '{"message":"column does not exist"}', { status });
  });
  return calls;
}

describe("limit reached email", () => {
  it("does nothing without a Resend key", async () => {
    const calls = mockPatch(200, [{}]);
    expect(await maybeSend(user, 3, now)).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("sends once when the month is claimed", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const calls = mockPatch(200, [{ id: "u1" }]);
    expect(await maybeSend(user, 3, now)).toBe(true);
    expect(decodeURIComponent(calls[0])).toContain("limit_email_month.neq.2026-10");
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("a@b.co");
    expect(sent[0].html).toContain("all 3 free scans");
    expect(sent[0].html).toContain("November 1");
  });

  it("does not send again in the same month", async () => {
    process.env.RESEND_API_KEY = "re_test";
    mockPatch(200, []);
    expect(await maybeSend(user, 3, now)).toBe(false);
    expect(sent).toHaveLength(0);
  });

  it("sends nothing before the migration adds the column", async () => {
    process.env.RESEND_API_KEY = "re_test";
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockPatch(400);
    expect(await maybeSend(user, 3, now)).toBe(false);
    expect(sent).toHaveLength(0);
  });
});
