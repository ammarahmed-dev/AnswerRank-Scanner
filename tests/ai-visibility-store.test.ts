import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

let save: typeof import("@/lib/ai-visibility-store").saveVisibilityRun;
let list: typeof import("@/lib/ai-visibility-store").listVisibilityRuns;

const summary = { results: [], mentionRate: 40, citationRate: 20, checked: 5 };

beforeAll(async () => {
  process.env.SUPABASE_URL = "https://db.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  vi.resetModules();
  ({ saveVisibilityRun: save, listVisibilityRuns: list } = await import("@/lib/ai-visibility-store"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ai visibility store", () => {
  it("saves a run with the expected columns", async () => {
    let seen: { url: string; body: Record<string, unknown> } | null = null;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      seen = { url, body: JSON.parse(String(init.body)) };
      return new Response(null, { status: 201 });
    });
    expect(await save("u1", { name: "Acme", domain: "acme.com" }, ["best crm?"], ["perplexity"], summary)).toBe(true);
    expect(seen!.url).toBe("https://db.test/rest/v1/ai_visibility_runs");
    expect(seen!.body).toMatchObject({ user_id: "u1", brand_name: "Acme", domain: "acme.com", mention_rate: 40, citation_rate: 20, checked: 5, prompts: ["best crm?"], engines: ["perplexity"] });
  });

  it("returns false (and does not throw) when the table is missing", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", async () => new Response('{"message":"relation does not exist"}', { status: 404 }));
    expect(await save("u1", { name: "Acme", domain: "acme.com" }, ["p"], ["gemini"], summary)).toBe(false);
    expect(spy).toHaveBeenCalled();
    expect(String(spy.mock.calls[0])).not.toContain("relation");
  });

  it("returns false when the request throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", async () => { throw new Error("network down"); });
    expect(await save("u1", { name: "Acme", domain: "acme.com" }, ["p"], ["gemini"], summary)).toBe(false);
  });

  it("lists runs newest first, scoped to the user and domain, and maps columns", async () => {
    let requested = "";
    vi.stubGlobal("fetch", async (url: string) => {
      requested = url;
      return new Response(JSON.stringify([{ id: "r1", brand_name: "Acme", domain: "acme.com", prompts: ["p"], engines: ["gemini"], mention_rate: 60, citation_rate: 30, checked: 4, results: [], created_at: "2026-10-04T00:00:00Z" }]), { status: 200 });
    });
    const runs = await list("u 1", "acme.com", 500);
    expect(requested).toContain("user_id=eq.u%201");
    expect(requested).toContain("domain=eq.acme.com");
    expect(requested).toContain("order=created_at.desc");
    expect(requested).toContain("limit=50");
    expect(runs[0]).toMatchObject({ id: "r1", brandName: "Acme", mentionRate: 60, citationRate: 30, createdAt: "2026-10-04T00:00:00Z" });
  });

  it("returns an empty history when the table is missing or the call fails", async () => {
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 404 }));
    expect(await list("u1")).toEqual([]);
    vi.stubGlobal("fetch", async () => { throw new Error("down"); });
    expect(await list("u1")).toEqual([]);
  });
});
