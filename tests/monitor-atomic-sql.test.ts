import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
const directory = new URL("../supabase/migrations/", import.meta.url);
const load = (suffix: string) => readFileSync(new URL(readdirSync(directory).find(f => f.endsWith(suffix))!, directory), "utf8");
let db: PGlite;
const owner = "00000000-0000-4000-8000-000000000001";
const monitor = "00000000-0000-4000-8000-000000000002";
const save = (score = 0, user = owner) => db.query<{ id: string; score: number; scanned_at: Date }>("SELECT * FROM public.save_monitor_snapshot($1,$2,$3,'{\"metadata\":0}','method-v1')", [monitor, user, score]);

describe("atomic monitor snapshot SQL", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;`);
    await db.exec(load("20260524_monitor.sql"));
    await db.exec(load("_add_monitor_methodology_version.sql"));
    await db.exec(`REVOKE ALL ON public.monitored_urls,public.monitor_snapshots FROM PUBLIC,anon,authenticated;
      GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
      GRANT SELECT,INSERT,UPDATE ON public.monitored_urls,public.monitor_snapshots TO service_role;
      INSERT INTO auth.users VALUES ('${owner}');
      INSERT INTO public.monitored_urls(id,user_id,url) VALUES ('${monitor}','${owner}','https://example.invalid');`);
    await db.exec(load("_atomic_monitor_snapshot.sql"));
  }, 30000);
  afterAll(async () => { await db?.close(); });

  it("commits a versioned zero observation and exact schedule timestamp together", async () => {
    await db.exec("SET ROLE service_role");
    try {
      const saved = (await save()).rows[0];
      expect(saved.score).toBe(0);
      expect((await db.query("SELECT s.methodology_version,s.category_scores,s.scanned_at=m.last_scanned_at AS same_time FROM public.monitor_snapshots s JOIN public.monitored_urls m ON m.id=s.monitored_url_id WHERE s.id=$1", [saved.id])).rows).toEqual([{ methodology_version: "method-v1", category_scores: { metadata: 0 }, same_time: true }]);
    } finally { await db.exec("RESET ROLE"); }
  });

  it("rolls back the inserted snapshot when schedule advancement fails", async () => {
    const before = (await db.query("SELECT count(*) FROM public.monitor_snapshots")).rows;
    await db.exec(`CREATE FUNCTION public.fail_monitor_schedule() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected schedule failure'; END $$;
      CREATE TRIGGER fail_schedule BEFORE UPDATE ON public.monitored_urls FOR EACH ROW EXECUTE FUNCTION public.fail_monitor_schedule();`);
    try { await expect(save(50)).rejects.toThrow("Injected schedule failure"); }
    finally { await db.exec("DROP TRIGGER fail_schedule ON public.monitored_urls"); }
    expect((await db.query("SELECT count(*) FROM public.monitor_snapshots")).rows).toEqual(before);
  });

  it.each(["monitor_snapshots", "monitored_urls"])("rejects a silently suppressed write to %s and rolls back", async table => {
    const before = (await db.query("SELECT count(*) FROM public.monitor_snapshots")).rows;
    const event = table === "monitor_snapshots" ? "INSERT" : "UPDATE";
    await db.exec(`CREATE OR REPLACE FUNCTION public.suppress_monitor_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;
      CREATE TRIGGER suppress_write BEFORE ${event} ON public.${table} FOR EACH ROW EXECUTE FUNCTION public.suppress_monitor_write();`);
    try { await expect(save(40)).rejects.toThrow("affected no row"); }
    finally { await db.exec(`DROP TRIGGER suppress_write ON public.${table}`); }
    expect((await db.query("SELECT count(*) FROM public.monitor_snapshots")).rows).toEqual(before);
  });

  it("rejects a different owner and invalid observations without inserting", async () => {
    const before = (await db.query("SELECT count(*) FROM public.monitor_snapshots")).rows;
    await expect(save(60, "00000000-0000-4000-8000-000000000003")).rejects.toMatchObject({ code: "P0002" });
    await expect(save(101)).rejects.toMatchObject({ code: "22023" });
    await expect(db.query("SELECT * FROM public.save_monitor_snapshot($1,$2,30,'[]',null)", [monitor, owner])).rejects.toMatchObject({ code: "22023" });
    expect((await db.query("SELECT count(*) FROM public.monitor_snapshots")).rows).toEqual(before);
  });

  it.each(["anon", "authenticated"])("denies %s execution", async role => {
    await db.exec(`SET ROLE ${role}`);
    try { await expect(save()).rejects.toMatchObject({ code: "42501" }); }
    finally { await db.exec("RESET ROLE"); }
  });
});
