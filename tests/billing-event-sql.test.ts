import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
const dir = new URL("../supabase/migrations/", import.meta.url);
const sql = readFileSync(new URL(readdirSync(dir).find(f => f.endsWith("_atomic_billing_event.sql"))!, dir), "utf8");
const user = "00000000-0000-4000-8000-000000000001";
const baseline: { plan: string; plan_expires_at: string | null; lemonsqueezy_subscription_id: string | null } = { plan: "free", plan_expires_at: null, lemonsqueezy_subscription_id: null };
let db: PGlite;
const apply = (key: string, patch: Record<string, unknown>, expected = baseline, id = user) => db.query<{ applied: boolean }>("SELECT public.apply_billing_event($1,$2,$3,$4) AS applied", [key.repeat(64), id, JSON.stringify(expected), JSON.stringify(patch)]);

describe("atomic billing event SQL", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE TABLE public.profiles(id uuid PRIMARY KEY,plan text NOT NULL CHECK(plan IN ('free','onetime','pro','agency')),
        plan_expires_at timestamptz,lemonsqueezy_subscription_id text,lemonsqueezy_portal_url text);
      CREATE TABLE public.webhook_events(event_id text PRIMARY KEY,processed_at timestamptz NOT NULL DEFAULT now());
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY; ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
      REVOKE ALL ON public.profiles,public.webhook_events FROM PUBLIC,anon,authenticated;
      GRANT USAGE ON SCHEMA public TO service_role,anon,authenticated;
      GRANT SELECT,UPDATE ON public.profiles TO service_role; GRANT SELECT,INSERT ON public.webhook_events TO service_role;
      INSERT INTO public.profiles(id,plan) VALUES ('${user}','free');`);
    await db.exec(sql);
  }, 30000);
  afterAll(async () => { await db?.close(); });

  it("commits a mutation/receipt once and does not replay it after later profile changes", async () => {
    await db.exec("SET ROLE service_role");
    try {
      expect((await apply("a", { plan: "pro", lemonsqueezy_subscription_id: "s1" })).rows[0].applied).toBe(true);
      await db.exec(`UPDATE public.profiles SET plan='agency',lemonsqueezy_subscription_id='s2' WHERE id='${user}'`);
      expect((await apply("a", { plan: "pro" })).rows[0].applied).toBe(false);
      expect((await db.query("SELECT plan,lemonsqueezy_subscription_id FROM public.profiles")).rows).toEqual([{ plan: "agency", lemonsqueezy_subscription_id: "s2" }]);
      expect((await db.query("SELECT count(*)::int AS n FROM public.webhook_events")).rows).toEqual([{ n: 1 }]);
    } finally { await db.exec("RESET ROLE"); }
  });
  it("recognizes queued duplicate commits on the same receipt", async () => {
    // One PGlite connection queues these calls; this is not a contention benchmark.
    const expected = { ...baseline, plan: "agency", lemonsqueezy_subscription_id: "s2" };
    const results = await Promise.all(Array.from({ length: 5 }, () => apply("9", { plan: "agency" }, expected)));
    expect(results.filter(r => r.rows[0].applied)).toHaveLength(1);
  });
  it("rejects a changed profile without consuming its event", async () => {
    await expect(apply("b", { plan: "onetime" })).rejects.toMatchObject({ code: "40001" });
    expect((await db.query("SELECT count(*)::int AS n FROM public.webhook_events WHERE event_id=$1", ["b".repeat(64)])).rows).toEqual([{ n: 0 }]);
  });
  it("rolls back the receipt when profile mutation fails, allowing a retry", async () => {
    const expected = { ...baseline, plan: "agency", lemonsqueezy_subscription_id: "s2" };
    await expect(apply("c", { plan: "invalid" }, expected)).rejects.toMatchObject({ code: "23514" });
    expect((await apply("c", { plan: "pro", plan_expires_at: null }, expected)).rows[0].applied).toBe(true);
  });
  it.each(["profiles", "webhook_events"])("rolls back silently suppressed %s writes", async table => {
    const event = table === "profiles" ? "UPDATE" : "INSERT";
    await db.exec(`CREATE OR REPLACE FUNCTION public.suppress_billing_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;
      CREATE TRIGGER suppress BEFORE ${event} ON public.${table} FOR EACH ROW EXECUTE FUNCTION public.suppress_billing_write();`);
    try { await expect(apply("d", { plan: "free" }, { ...baseline, plan: "pro", lemonsqueezy_subscription_id: "s2" })).rejects.toThrow("affected no row"); }
    finally { await db.exec(`DROP TRIGGER suppress ON public.${table}`); }
    expect((await db.query("SELECT count(*)::int AS n FROM public.webhook_events WHERE event_id=$1", ["d".repeat(64)])).rows).toEqual([{ n: 0 }]);
  });
  it("rejects unknown patch fields and missing profiles", async () => {
    await expect(apply("e", { onetime_scan_count: 0 })).rejects.toMatchObject({ code: "22023" });
    await expect(apply("f", { plan: "pro" }, baseline, "00000000-0000-4000-8000-000000000002")).rejects.toMatchObject({ code: "P0002" });
  });
  it.each(["anon", "authenticated"])("denies %s execution", async role => {
    await db.exec(`SET ROLE ${role}`);
    try { await expect(apply("f", { plan: "pro" })).rejects.toMatchObject({ code: "42501" }); }
    finally { await db.exec("RESET ROLE"); }
  });
});
