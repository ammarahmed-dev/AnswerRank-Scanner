import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

const directory = new URL("../supabase/migrations/", import.meta.url);
const migration = readFileSync(new URL(readdirSync(directory).find(name => name.endsWith("_add_monitor_methodology_version.sql"))!, directory), "utf8");
let db: PGlite;
const monitor = "00000000-0000-4000-8000-000000000001";

describe("monitor methodology migration", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;`);
    await db.exec(readFileSync(new URL("20260524_monitor.sql", directory), "utf8"));
    await db.exec(`REVOKE ALL ON public.monitor_snapshots FROM PUBLIC,anon,authenticated;
      GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
      GRANT SELECT,INSERT ON public.monitor_snapshots TO service_role;
      INSERT INTO auth.users VALUES ('00000000-0000-4000-8000-000000000002');
      INSERT INTO public.monitored_urls(id,user_id,url) VALUES ('${monitor}','00000000-0000-4000-8000-000000000002','https://example.invalid');
      INSERT INTO public.monitor_snapshots(monitored_url_id,score,category_scores) VALUES ('${monitor}',0,'{"metadata":0}');`);
    await db.exec(migration);
  }, 30000);
  afterAll(async () => { await db?.close(); });

  it("preserves historical observations and gives them no invented version", async () => {
    expect((await db.query("SELECT score,category_scores,methodology_version FROM public.monitor_snapshots")).rows).toEqual([{ score: 0, category_scores: { metadata: 0 }, methodology_version: null }]);
  });

  it("supports new versioned snapshots and old writers without changing access", async () => {
    await db.exec("SET ROLE service_role");
    try {
      await db.query("INSERT INTO public.monitor_snapshots(monitored_url_id,score,methodology_version) VALUES ($1,80,'method-v1')", [monitor]);
      await db.query("INSERT INTO public.monitor_snapshots(monitored_url_id,score) VALUES ($1,70)", [monitor]);
      expect((await db.query("SELECT methodology_version FROM public.monitor_snapshots WHERE score=80")).rows).toEqual([{ methodology_version: "method-v1" }]);
    } finally { await db.exec("RESET ROLE"); }
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`SET ROLE ${role}`);
      try { await expect(db.query("SELECT methodology_version FROM public.monitor_snapshots")).rejects.toMatchObject({ code: "42501" }); }
      finally { await db.exec("RESET ROLE"); }
    }
  });

  it("can be reapplied without losing observations or disabling RLS", async () => {
    const before = (await db.query("SELECT count(*) FROM public.monitor_snapshots")).rows;
    await db.exec(migration);
    expect((await db.query("SELECT count(*) FROM public.monitor_snapshots")).rows).toEqual(before);
    expect((await db.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.monitor_snapshots'::regclass")).rows).toEqual([{ relrowsecurity: true }]);
  });
});
