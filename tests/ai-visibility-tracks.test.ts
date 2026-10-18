import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

let mod: typeof import("@/lib/ai-visibility-tracks");

beforeAll(async () => {
  process.env.SUPABASE_URL = "https://db.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  vi.resetModules();
  mod = await import("@/lib/ai-visibility-tracks");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("track plan limits", () => {
  const engines = [{ name: "perplexity" as const }, { name: "gemini" as const }];
  it("gives Pro 10 prompts on 2 engines and Agency 50", () => {
    const prompts = Array.from({ length: 60 }, (_, i) => `p${i}`);
    expect(mod.trimPrompts(prompts, "pro")).toHaveLength(10);
    expect(mod.trimPrompts(prompts, "agency")).toHaveLength(50);
    expect(mod.pickEngines(engines, "pro")).toHaveLength(2);
  });
  it("runs nothing for other plans", () => {
    expect(mod.trimPrompts(["a"], "free")).toEqual([]);
    expect(mod.pickEngines(engines, "onetime")).toEqual([]);
  });
});

describe("track storage", () => {
  it("lists tracks never run or older than 6 days", async () => {
    let seen = "";
    vi.stubGlobal("fetch", async (url: string) => {
      seen = url;
      return Response.json([{ id: "t1", user_id: "u1", brand_name: "Acme", domain: "acme.com", prompts: ["q"], last_run_at: null }]);
    });
    const tracks = await mod.listDueTracks(5, Date.UTC(2026, 9, 18));
    expect(tracks).toEqual([{ id: "t1", userId: "u1", brandName: "Acme", domain: "acme.com", prompts: ["q"], lastRunAt: null }]);
    const decoded = decodeURIComponent(seen);
    expect(decoded).toContain("last_run_at.is.null,last_run_at.lt.2026-10-12T00:00:00.000Z");
    expect(decoded).toContain("limit=5");
  });
  it("returns an empty list when the table is missing", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 404 }));
    expect(await mod.listDueTracks()).toEqual([]);
  });
  it("upserts on user and domain", async () => {
    let seen: { url: string; headers: Record<string, string>; body: Record<string, unknown> } | null = null;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      seen = { url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) };
      return new Response(null, { status: 201 });
    });
    expect(await mod.upsertTrack("u1", { name: "Acme", domain: "acme.com" }, ["q"])).toBe(true);
    expect(seen!.url).toContain("on_conflict=user_id,domain");
    expect(seen!.headers.Prefer).toContain("merge-duplicates");
    expect(seen!.body).toMatchObject({ user_id: "u1", domain: "acme.com", prompts: ["q"] });
    expect(seen!.body).not.toHaveProperty("last_run_at");
  });
  it("records the enrollment run as the latest run", async () => {
    let body: Record<string, unknown> = {};
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return new Response(null, { status: 201 });
    });
    await mod.upsertTrack("u1", { name: "Acme", domain: "acme.com" }, ["q"], new Date("2026-10-18T10:00:00Z"));
    expect(body.last_run_at).toBe("2026-10-18T10:00:00.000Z");
  });
});
