import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const tables = ["ai_visibility_runs", "app_stats", "audit_runs", "compare_runs", "contact_messages", "monitor_snapshots", "monitored_urls", "profiles", "reports", "scan_usage", "waitlist", "webhook_events"];

const migration = readFileSync(new URL("../supabase/migrations/20261024213440_restrict_public_table_privileges.sql", import.meta.url), "utf8");
const quote = (s: string) => `"${s.replaceAll('"', '""')}"`;
let db: PGlite;

async function asRole(role: string, sql: string) {
  await db.exec(`SET ROLE ${quote(role)}`);
  try { return await db.query(sql); }
  finally { await db.exec("RESET ROLE"); }
}

describe("browser table privilege migration", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
      GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION auth.uid() TO PUBLIC;`);
    // Reproduce Supabase's older automatic browser grants before testing removal.
    await db.exec("ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated");
    // Synthetic fixtures model the app's required access boundaries. They contain
    // no production schema export, customer rows, or production policy snapshot.
    for (const table of tables) {
      const columns = table === "waitlist" ? "email text NOT NULL, source text NOT NULL"
        : table === "app_stats" ? "key text, value integer" : "id integer";
      await db.exec(`CREATE TABLE public.${quote(table)} (${columns});
        ALTER TABLE public.${quote(table)} ENABLE ROW LEVEL SECURITY;
        GRANT ALL ON TABLE public.${quote(table)} TO anon, authenticated, service_role;`);
    }
    await db.exec(`CREATE POLICY waitlist_insert ON public.waitlist FOR INSERT TO anon, authenticated WITH CHECK (true);
      CREATE POLICY "Allow waitlist public select for insert return" ON public.waitlist FOR SELECT TO anon, authenticated USING (true);
      CREATE POLICY stats_read ON public.app_stats FOR SELECT TO anon, authenticated USING (true);`);
    await db.exec(`CREATE UNIQUE INDEX waitlist_email_source_unique ON public.waitlist (lower(email),source);
      INSERT INTO public.waitlist(email,source) VALUES ('private@example.test','fixture');
      INSERT INTO public.app_stats(key,value) VALUES ('fixture',1);`);
    // Reproduce the overbroad access pattern using synthetic fixture rows.
    expect((await asRole("anon", "SELECT email FROM public.waitlist")).rows).toHaveLength(1);
    await db.exec(migration);
  }, 30000);

  afterAll(async () => { await db?.close(); });

  it.each(["anon", "authenticated"])("keeps %s waitlist inserts without permitting reads or returning personal data", async role => {
    await expect(asRole(role, `INSERT INTO public.waitlist(email,source) VALUES ('${role}@example.test','fixture')`)).resolves.toBeDefined();
    await expect(asRole(role, "SELECT email FROM public.waitlist")).rejects.toMatchObject({ code: "42501" });
    await expect(asRole(role, `INSERT INTO public.waitlist(email,source) VALUES ('${role}-return@example.test','fixture') RETURNING email`)).rejects.toMatchObject({ code: "42501" });
    await expect(asRole(role, `INSERT INTO public.waitlist(email,source) VALUES ('${role}@example.test','fixture')`)).rejects.toMatchObject({ code: "23505" });
  });

  it.each(["anon", "authenticated"])("denies %s all direct customer/quota table operations and administrative table privileges", async role => {
    for (const table of tables) {
      const name = `public.${quote(table)}`;
      for (const privilege of ["TRUNCATE", "REFERENCES", "TRIGGER"]) {
        const result = await db.query<{ allowed: boolean }>(`SELECT has_table_privilege($1,$2,$3) AS allowed`, [role, name, privilege]);
        expect(result.rows[0].allowed, `${role} ${table} ${privilege}`).toBe(false);
      }
      await expect(asRole(role, `TRUNCATE TABLE ${name}`)).rejects.toMatchObject({ code: "42501" });
      if (table !== "app_stats") await expect(asRole(role, `SELECT * FROM ${name}`)).rejects.toMatchObject({ code: "42501" });
      for (const privilege of ["INSERT", "UPDATE", "DELETE"]) {
        if (table === "waitlist" && privilege === "INSERT") continue;
        const result = await db.query<{ allowed: boolean }>(`SELECT has_table_privilege($1,$2,$3) AS allowed`, [role, name, privilege]);
        expect(result.rows[0].allowed, `${role} ${table} ${privilege}`).toBe(false);
      }
    }
    expect((await asRole(role, "SELECT value FROM public.app_stats WHERE key='fixture'")).rows).toEqual([{ value: 1 }]);
  });

  it("preserves server privileges and all fixture rows", async () => {
    for (const table of tables) for (const privilege of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]) {
      const result = await db.query<{ allowed: boolean }>(`SELECT has_table_privilege('service_role',$1,$2) AS allowed`, [`public.${quote(table)}`, privilege]);
      expect(result.rows[0].allowed, `${table} ${privilege}`).toBe(true);
    }
    expect((await db.query("SELECT email FROM public.waitlist WHERE source='fixture'")).rows).toHaveLength(3);
    await expect(asRole("service_role", "UPDATE public.app_stats SET value=2 WHERE key='fixture' RETURNING value")).resolves.toMatchObject({ rows: [{ value: 2 }] });
  });

  it("remains repeatable and prevents implicit public privileges on future tables", async () => {
    await db.exec(migration);
    await db.exec("CREATE TABLE public.future_private_table(id integer)");
    for (const role of ["anon", "authenticated"]) {
      await expect(asRole(role, "SELECT * FROM public.future_private_table")).rejects.toMatchObject({ code: "42501" });
    }
  });
});
