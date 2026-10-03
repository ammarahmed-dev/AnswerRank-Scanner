import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

let getAuthContext: (req: Request) => Promise<{ user: { id: string } | null; plan: string }>;
let calls: Array<{ url: string; method: string }>;

beforeAll(async () => {
  process.env.SUPABASE_URL = "https://db.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  delete process.env.INTERNAL_API_SECRET;
  vi.resetModules();
  ({ getAuthContext } = await import("@/lib/auth-server"));
});

afterEach(() => vi.unstubAllGlobals());

function mockDb(initialProfiles: Array<Record<string, unknown>>) {
  let profiles = initialProfiles;
  calls = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    calls.push({ url, method });
    if (url.endsWith("/auth/v1/user")) return new Response(JSON.stringify({ id: "u1", email: "a@b.co" }), { status: 200 });
    if (url.includes("/rest/v1/profiles") && method === "POST") {
      profiles = [{ plan: "free", plan_expires_at: null, welcome_email_sent: null }];
      return new Response(null, { status: 201 });
    }
    if (url.includes("/rest/v1/profiles")) return new Response(JSON.stringify(profiles), { status: 200 });
    return new Response("{}", { status: 200 });
  });
}

const req = (token?: string) => new Request("https://www.aeocheck.co/api/x", { headers: token ? { authorization: `Bearer ${token}` } : {} });

describe("getAuthContext", () => {
  it("treats requests without a token as guests", async () => {
    mockDb([]);
    expect(await getAuthContext(req())).toMatchObject({ user: null, plan: "guest" });
    expect(calls).toHaveLength(0);
  });

  it("does not write anything for an existing user", async () => {
    mockDb([{ plan: "pro", plan_expires_at: null, welcome_email_sent: true }]);
    const ctx = await getAuthContext(req("t"));
    expect(ctx).toMatchObject({ user: { id: "u1" }, plan: "pro" });
    expect(calls.filter((c) => c.method !== "GET")).toHaveLength(0);
  });

  it("creates the profile for a new user", async () => {
    mockDb([]);
    const ctx = await getAuthContext(req("t"));
    expect(ctx).toMatchObject({ user: { id: "u1" }, plan: "free" });
    expect(calls.filter((c) => c.method === "POST" && c.url.includes("/profiles"))).toHaveLength(1);
  });

  it("downgrades an expired plan to free", async () => {
    mockDb([{ plan: "pro", plan_expires_at: "2020-01-01T00:00:00Z", welcome_email_sent: true }]);
    expect((await getAuthContext(req("t"))).plan).toBe("free");
  });
});
