import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";

const dir = new URL("../supabase/migrations/", import.meta.url);
const base = readFileSync(new URL("20261004_ai_visibility_runs.sql", dir), "utf8");
const repair = readFileSync(new URL(readdirSync(dir).find(f => f.endsWith("_restore_ai_visibility_server_access.sql"))!, dir), "utf8");
const owner = "00000000-0000-4000-8000-000000000001";
const other = "00000000-0000-4000-8000-000000000002";
let db: PGlite;

async function asRole(role: "anon" | "authenticated" | "service_role", sql: string) {
  await db.exec(`SET ROLE ${role}`);
  try { return await db.query(sql); }
  finally { await db.exec("RESET ROLE"); }
}
const insert = (user: string) => `INSERT INTO public.ai_visibility_runs
  (user_id,brand_name,domain,prompts,engines,mention_rate,citation_rate,checked,results)
  VALUES ('${user}','Synthetic fixture','fixture.invalid','[]','[]',0,0,0,'[]') RETURNING user_id`;

// Each path uses the real historical CREATE TABLE and new repair, not a reduced
// hand-written table. Fixtures are local only; no provider calls or customer rows.
describe.each(["clean install", "existing table"] as const)("AI visibility service access: %s", path => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${owner}'::uuid $$;
      GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
      INSERT INTO auth.users VALUES ('${owner}'),('${other}');`);
    await db.exec(base);
    if (path === "existing table") {
      // Reproduce inspected production access: browser CRUD denied, service
      // administrative grants present, but service SELECT/INSERT absent.
      await db.exec("GRANT TRUNCATE,REFERENCES,TRIGGER ON public.ai_visibility_runs TO service_role");
      await db.exec(insert(other));
    }
    await expect(asRole("service_role", "SELECT * FROM public.ai_visibility_runs LIMIT 0")).rejects.toMatchObject({ code: "42501" });
    await expect(asRole("service_role", insert(owner))).rejects.toMatchObject({ code: "42501" });
    await db.exec(repair);
  }, 30000);
  afterAll(async () => { await db?.close(); });

  it("permits server append/history, including a different owner through the existing BYPASSRLS role", async () => {
    await expect(asRole("service_role", insert(owner))).resolves.toMatchObject({ rows: [{ user_id: owner }] });
    await expect(asRole("service_role", insert(other))).resolves.toMatchObject({ rows: [{ user_id: other }] });
    expect((await asRole("service_role", "SELECT user_id FROM public.ai_visibility_runs")).rows.length).toBe(path === "existing table" ? 3 : 2);
  });

  it.each(["anon", "authenticated"] as const)("keeps %s direct reads/inserts denied even with a matching auth.uid policy", async role => {
    await expect(asRole(role, "SELECT * FROM public.ai_visibility_runs")).rejects.toMatchObject({ code: "42501" });
    await expect(asRole(role, insert(owner))).rejects.toMatchObject({ code: "42501" });
    for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]) {
      const result = await db.query<{ allowed: boolean }>("SELECT has_table_privilege($1,'public.ai_visibility_runs',$2) AS allowed", [role, privilege]);
      expect(result.rows[0].allowed).toBe(false);
    }
  });

  it("does not grant server UPDATE/DELETE or change pre-existing administrative grants", async () => {
    for (const privilege of ["UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]) {
      const result = await db.query<{ allowed: boolean }>("SELECT has_table_privilege('service_role','public.ai_visibility_runs',$1) AS allowed", [privilege]);
      expect(result.rows[0].allowed).toBe(path === "existing table" && ["TRUNCATE", "REFERENCES", "TRIGGER"].includes(privilege));
    }
    expect((await db.query<{ enabled: boolean }>("SELECT relrowsecurity AS enabled FROM pg_class WHERE oid='public.ai_visibility_runs'::regclass")).rows[0].enabled).toBe(true);
  });

  it("can be reapplied without changing saved fixture observations or grants", async () => {
    const before = await db.query("SELECT * FROM public.ai_visibility_runs ORDER BY id");
    await db.exec(repair);
    expect((await db.query("SELECT * FROM public.ai_visibility_runs ORDER BY id")).rows).toEqual(before.rows);
  });

  it("fails closed if the expected RLS boundary is missing", async () => {
    await db.exec("ALTER TABLE public.ai_visibility_runs DISABLE ROW LEVEL SECURITY");
    await expect(db.exec(repair)).rejects.toThrow("Expected AI visibility table with RLS enabled");
    await db.exec("ROLLBACK; ALTER TABLE public.ai_visibility_runs ENABLE ROW LEVEL SECURITY");
  });
});
