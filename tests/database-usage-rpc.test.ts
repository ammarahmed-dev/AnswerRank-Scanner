import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

let db: PGlite;
const migration = readFileSync(new URL("../supabase/migrations/20261003_atomic_scan_usage.sql", import.meta.url), "utf8");
const reserve = async (key: string, limit: number, date = "2026-10-01") =>
  (await db.query<{ count: number }>("SELECT public.reserve_scan_usage($1,$2::date,$3) AS count", [key, date, limit])).rows[0].count;

describe("atomic usage SQL", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE TABLE public.scan_usage(client_key text NOT NULL,usage_date date NOT NULL,
        scan_count integer NOT NULL DEFAULT 0,updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY(client_key,usage_date));
      ALTER TABLE public.scan_usage ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
      GRANT SELECT,INSERT,UPDATE ON public.scan_usage TO service_role;`);
    await db.exec(migration);
  }, 30000);
  afterAll(async () => { await db?.close(); });

  it("bounds queued reservations at the cap and releases only to zero", async () => {
    await db.exec("SET ROLE service_role");
    try {
      // PGlite queues these calls on one connection. This verifies SQL semantics,
      // not a multi-connection production contention benchmark.
      const results = await Promise.all(Array.from({ length: 20 }, () => reserve("queued", 3)));
      expect(results.filter(n => n > 0)).toEqual([1, 2, 3]);
      expect(results.filter(n => n === -1)).toHaveLength(17);
      await db.query("SELECT public.release_scan_usage('queued','2026-10-01')");
      expect(await reserve("queued", 3)).toBe(3);
      for (let i = 0; i < 5; i++) await db.query("SELECT public.release_scan_usage('queued','2026-10-01')");
      expect(await reserve("queued", 3)).toBe(1);
    } finally { await db.exec("RESET ROLE"); }
  });

  it("isolates account and monthly counters and rejects nonpositive limits", async () => {
    expect(await reserve("account-a", 1)).toBe(1);
    expect(await reserve("account-a", 1)).toBe(-1);
    expect(await reserve("account-b", 1)).toBe(1);
    expect(await reserve("account-a", 1, "2026-11-01")).toBe(1);
    expect(await reserve("zero-limit", 0)).toBe(-1);
    expect(await reserve("negative-limit", -1)).toBe(-1);
    expect((await db.query("SELECT * FROM public.scan_usage WHERE client_key IN ('zero-limit','negative-limit')")).rows).toHaveLength(0);
  });

  it.each(["anon", "authenticated"])("rejects %s execution of both quota functions", async role => {
    await db.exec(`SET ROLE ${role}`);
    try {
      await expect(reserve("forbidden", 3)).rejects.toMatchObject({ code: "42501" });
      await expect(db.query("SELECT public.release_scan_usage('forbidden','2026-10-01')")).rejects.toMatchObject({ code: "42501" });
    } finally { await db.exec("RESET ROLE"); }
  });
});
