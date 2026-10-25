import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
const directory = new URL("../supabase/migrations/", import.meta.url);
const load = (suffix: string) => readFileSync(new URL(readdirSync(directory).find(f => f.endsWith(suffix))!, directory), "utf8");
const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
let db: PGlite;
const create = (url = "https://example.invalid/one", limit = 1, user = owner) => db.query<{ result: { limit_reached: boolean; item?: { id: string; frequency: string; url: string } } }>("SELECT public.create_monitor_with_limit($1,$2,null,$3) AS result", [user, url, limit]);

describe("atomic monitor creation SQL", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;`);
    await db.exec(load("20260524_monitor.sql"));
    await db.exec(`REVOKE ALL ON public.monitored_urls,public.monitor_snapshots FROM PUBLIC,anon,authenticated;
      GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
      GRANT SELECT,INSERT ON public.monitored_urls TO service_role;
      INSERT INTO auth.users VALUES ('${owner}'),('${other}');`);
    await db.exec(load("_atomic_monitor_creation.sql"));
  }, 30000);
  beforeEach(async () => { await db.exec("RESET ROLE; TRUNCATE public.monitored_urls CASCADE"); });
  afterAll(async () => { await db?.close(); });

  it("admits only one queued request at a one-monitor cap", async () => {
    await db.exec("SET ROLE service_role");
    try {
      // PGlite queues a single connection; not a true multi-connection contention benchmark.
      const results = await Promise.all(Array.from({ length: 5 }, (_,i) => create(`https://example.invalid/${i}`)));
      expect(results.map(r => r.rows[0].result.limit_reached)).toEqual([false,true,true,true,true]);
      expect((await db.query("SELECT count(*)::integer AS count FROM public.monitored_urls")).rows).toEqual([{ count: 1 }]);
    } finally { await db.exec("RESET ROLE"); }
  });
  it("keeps account limits isolated and returns the committed weekly row", async () => {
    expect((await create()).rows[0].result).toMatchObject({ limit_reached: false, item: { url: "https://example.invalid/one", frequency: "weekly" } });
    expect((await create(undefined, 1, other)).rows[0].result.limit_reached).toBe(false);
    expect((await create("https://example.invalid/two")).rows[0].result).toEqual({ limit_reached: true });
  });
  it("preserves duplicate uniqueness below the cap", async () => {
    await create(undefined,10);
    await expect(create(undefined,10)).rejects.toMatchObject({ code: "23505" });
  });
  it("holds an account-scoped advisory lock until transaction end and rolls back its insert", async () => {
    await db.exec("BEGIN");
    try {
      await create(); await create(undefined,1,other);
      expect((await db.query("SELECT count(*)::integer AS count FROM pg_locks WHERE locktype='advisory' AND pid=pg_backend_pid() AND granted")).rows).toEqual([{ count: 2 }]);
    } finally { await db.exec("ROLLBACK"); }
    expect((await db.query("SELECT count(*)::integer AS count FROM public.monitored_urls")).rows).toEqual([{ count: 0 }]);
    expect((await db.query("SELECT count(*)::integer AS count FROM pg_locks WHERE locktype='advisory' AND pid=pg_backend_pid() AND granted")).rows).toEqual([{ count: 0 }]);
  });
  it("does not retain a slot after a failed or silently suppressed insert", async () => {
    await db.exec(`CREATE FUNCTION public.suppress_monitor_create() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;
      CREATE TRIGGER suppress_create BEFORE INSERT ON public.monitored_urls FOR EACH ROW EXECUTE FUNCTION public.suppress_monitor_create();`);
    try { await expect(create()).rejects.toThrow("affected no row"); }
    finally { await db.exec("DROP TRIGGER suppress_create ON public.monitored_urls"); }
    await expect(create(undefined,1,"00000000-0000-4000-8000-000000000099")).rejects.toMatchObject({ code: "23503" });
    expect((await create()).rows[0].result.limit_reached).toBe(false);
  });
  it.each([0,-1,1000])("rejects invalid limit %s", async cap => {
    await expect(create(undefined,cap)).rejects.toMatchObject({ code: "22023" });
  });
  it("fails closed under a repeatable-read snapshot", async () => {
    await db.exec("BEGIN ISOLATION LEVEL REPEATABLE READ");
    try { await expect(create()).rejects.toMatchObject({ code: "25001" }); }
    finally { await db.exec("ROLLBACK"); }
  });
  it.each(["anon","authenticated"])("denies browser role %s execution and direct insertion", async role => {
    await db.exec(`SET ROLE ${role}`);
    try {
      await expect(create()).rejects.toMatchObject({ code: "42501" });
      await expect(db.query("INSERT INTO public.monitored_urls(user_id,url) VALUES($1,'https://example.invalid')",[owner])).rejects.toMatchObject({ code: "42501" });
    } finally { await db.exec("RESET ROLE"); }
  });
});
