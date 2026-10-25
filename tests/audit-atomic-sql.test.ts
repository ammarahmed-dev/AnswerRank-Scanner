import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
const directory = new URL("../supabase/migrations/", import.meta.url);
const load = (suffix: string) => readFileSync(new URL(readdirSync(directory).find(f => f.endsWith(suffix))!, directory), "utf8");
const owner = "00000000-0000-4000-8000-000000000001";
const audit = "00000000-0000-4000-8000-000000000002";
const urls = ["https://example.invalid/a", "https://example.invalid/b", "https://example.invalid/c"];
const page = (index = 0, score = 0) => ({ url: urls[index], score, status: "done", categoryScores: {}, issues: [], passingCount: 0 });
let db: PGlite;
const save = (result: unknown = page(), user = owner) => db.query("SELECT * FROM public.save_audit_page_result($1,$2,$3)", [audit, user, JSON.stringify(result)]);
const state = async () => (await db.query("SELECT results,scanned_pages,total_pages,aggregate_score,status,completed_at FROM public.audit_runs WHERE id=$1", [audit])).rows[0];

describe("atomic audit page persistence SQL", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;`);
    await db.exec(load("20260525_audit.sql"));
    await db.exec(`REVOKE ALL ON public.audit_runs FROM PUBLIC,anon,authenticated;
      GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;`);
    await db.exec(load("_atomic_audit_page_result.sql"));
  }, 30000);
  beforeEach(async () => {
    await db.exec("RESET ROLE; TRUNCATE public.audit_runs");
    await db.query("INSERT INTO public.audit_runs(id,user_id,domain,total_pages,urls) VALUES($1,$2,'example.invalid',3,$3)", [audit, owner, JSON.stringify(urls)]);
  });
  afterAll(async () => { await db?.close(); });

  it("appends distinct queued pages from current state and preserves a valid zero score", async () => {
    await db.exec("SET ROLE service_role");
    try {
      // PGlite queues one connection; this is not a multi-connection contention benchmark.
      const outcomes = await Promise.all([save(page(0, 0)), save(page(1, 100))]);
      expect(outcomes.map(x => x.rows[0])).toEqual([
        { scanned_pages: 1, total_pages: 3, aggregate_score: 0, complete: false },
        { scanned_pages: 2, total_pages: 3, aggregate_score: 50, complete: false },
      ]);
      expect(await state()).toMatchObject({ results: [page(0, 0), page(1, 100)], scanned_pages: 2, aggregate_score: 50, status: "running", completed_at: null });
    } finally { await db.exec("RESET ROLE"); }
  });
  it("rejects duplicate pages without advancing progress", async () => {
    await save(); const before = await state();
    await expect(save(page(0, 100))).rejects.toMatchObject({ code: "23505" });
    expect(await state()).toEqual(before);
  });
  it("finishes only after all results and excludes failed pages from the average", async () => {
    await save(page(0, 0)); await save(page(1, 100));
    expect((await save({ ...page(2), status: "error", error: "Scan failed." })).rows).toEqual([{ scanned_pages: 3, total_pages: 3, aggregate_score: 50, complete: true }]);
    expect(await state()).toMatchObject({ scanned_pages: 3, status: "completed", completed_at: expect.any(Date) });
    await expect(save()).rejects.toMatchObject({ code: "55000" });
  });
  it("keeps an all-error aggregate unavailable and derives progress from stored results", async () => {
    await db.exec("UPDATE public.audit_runs SET scanned_pages=99");
    expect((await save({ ...page(), status: "error", error: "Scan failed." })).rows[0]).toEqual({ scanned_pages: 1, total_pages: 3, aggregate_score: null, complete: false });
  });
  it("rejects an unknown owner, unsaved target and finished audit without changes", async () => {
    const before = await state();
    await expect(save(page(), "00000000-0000-4000-8000-000000000003")).rejects.toMatchObject({ code: "P0002" });
    await expect(save({ ...page(), url: "https://other.invalid" })).rejects.toMatchObject({ code: "22023" });
    expect(await state()).toEqual(before);
    await db.exec("UPDATE public.audit_runs SET status='failed'");
    await expect(save()).rejects.toMatchObject({ code: "55000" });
  });
  it.each([null, [], {}, { ...page(), score: "0" }, { ...page(), score: -1 }, { ...page(), score: 101 }, { ...page(), score: 1.5 }, { ...page(), status: "error" }, { ...page(), error: "contradiction" }])("rejects malformed result %j", async result => {
    const before = await state();
    await expect(save(result)).rejects.toMatchObject({ code: "22023" });
    expect(await state()).toEqual(before);
  });
  it.each(["urls='{}'", "results='{}'", "total_pages=2"])("rejects invalid stored state: %s", async patch => {
    await db.exec(`UPDATE public.audit_runs SET ${patch}`); const before = await state();
    await expect(save()).rejects.toMatchObject({ code: "22023" });
    expect(await state()).toEqual(before);
  });
  it.each([false, true])("rolls back all progress fields after a failed or suppressed update: %s", async suppress => {
    const before = await state();
    await db.exec(`CREATE OR REPLACE FUNCTION public.fail_audit_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ${suppress ? "RETURN NULL;" : "RAISE EXCEPTION 'Injected failure';"} END $$;
      CREATE TRIGGER fail_audit BEFORE UPDATE ON public.audit_runs FOR EACH ROW EXECUTE FUNCTION public.fail_audit_write();`);
    try { await expect(save()).rejects.toThrow(suppress ? "affected no row" : "Injected failure"); }
    finally { await db.exec("DROP TRIGGER fail_audit ON public.audit_runs"); }
    expect(await state()).toEqual(before);
  });
  it.each(["anon", "authenticated"])("denies %s execution", async role => {
    await db.exec(`SET ROLE ${role}`);
    try { await expect(save()).rejects.toMatchObject({ code: "42501" }); }
    finally { await db.exec("RESET ROLE"); }
  });
});
