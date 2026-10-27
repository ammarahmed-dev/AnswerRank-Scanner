import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readdirSync } from "node:fs";
import { databaseInstallSteps, installManifest } from "../scripts/lib/database-install.mjs";

const tables = ["ai_visibility_runs","app_stats","audit_runs","compare_runs","contact_messages","monitor_snapshots","monitored_urls","profiles","reports","scan_usage","waitlist","webhook_events"];
const user = "00000000-0000-4000-8000-000000000001";
const reportId = "00000000-0000-4000-8000-000000000002";
const steps: Array<{path:string;sql:string}> = databaseInstallSteps();
let db: PGlite;
async function asRole(role: string, sql: string, params?: unknown[]) {
  await db.exec(`SET ROLE ${role}`);
  try { return await db.query(sql, params); }
  finally { await db.exec("RESET ROLE").catch(() => undefined); }
}
async function transaction(work: () => Promise<void>) {
  await db.exec("BEGIN");
  try { await work(); } finally { await db.exec("ROLLBACK"); }
}

it("keeps an explicit ordered manifest covering every repository migration", () => {
  expect(installManifest.migrations).toEqual(readdirSync(new URL("../supabase/migrations/",import.meta.url)).filter(f=>f.endsWith(".sql")).sort());
  expect(new Set(steps.map(s=>s.path)).size).toBe(steps.length);
});

describe.each(["clean install","historical upgrade"])("database install: %s", path => {
  beforeAll(async () => {
    db = new PGlite({ extensions: { pgcrypto } });
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${user}'::uuid $$;
      GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
      INSERT INTO auth.users VALUES ('${user}');`);
    if(path==="historical upgrade") await db.exec("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role");
    for (const step of steps) {
      if (path === "historical upgrade" && step.path.includes("20261024213440_")) {
        await db.exec(`INSERT INTO public.profiles(id,email) VALUES ('${user}','fixture@example.test');
          INSERT INTO public.reports(id,user_id,url,score,result) VALUES ('${reportId}','${user}','https://fixture.invalid',0,'{"kept":true}');
          INSERT INTO public.webhook_events(event_id) VALUES ('historical-fixture');
          INSERT INTO public.contact_messages(name,email,subject,message) VALUES ('Fixture','fixture@example.test','general','Keep this fixture');
          INSERT INTO public.app_stats(key,value) VALUES ('fixture',7);`);
      }
      await db.exec(step.sql);
    }
    if (path === "clean install") await db.exec(`INSERT INTO public.profiles(id) VALUES ('${user}')`);
  },60000);
  afterAll(async()=>{await db?.close();});

  it("creates all twelve tables with RLS and no implicit browser access", async()=>{
    const result=await db.query<{name:string;rls:boolean}>("SELECT relname AS name,relrowsecurity AS rls FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' ORDER BY relname");
    expect(result.rows.map(r=>r.name)).toEqual(tables);
    expect(result.rows.every(r=>r.rls)).toBe(true);
    for (const role of ["anon","authenticated"]) for (const table of tables) {
      for (const privilege of ["SELECT","INSERT","UPDATE","DELETE","TRUNCATE","REFERENCES","TRIGGER"]) {
        const allowed=table==="waitlist"&&privilege==="INSERT" || table==="app_stats"&&privilege==="SELECT";
        const value=await db.query<{allowed:boolean}>("SELECT has_table_privilege($1,$2,$3) AS allowed",[role,`public.${table}`,privilege]);
        expect(value.rows[0].allowed,`${role} ${table} ${privilege}`).toBe(allowed);
      }
    }
  });

  it("supplies required server CRUD without implicit defaults or extra AI mutation rights",async()=>{
    for (const table of tables) for (const privilege of ["SELECT","INSERT","UPDATE","DELETE","TRUNCATE","REFERENCES","TRIGGER"]) {
      const allowed=["SELECT","INSERT","UPDATE","DELETE"].includes(privilege) && table!=="waitlist" && (table!=="ai_visibility_runs" || privilege==="SELECT" || privilege==="INSERT");
      const value=await db.query<{allowed:boolean}>("SELECT has_table_privilege('service_role',$1,$2) AS allowed",[`public.${table}`,privilege]);
      expect(value.rows[0].allowed,`service ${table} ${privilege}`).toBe(allowed);
    }
    await transaction(async()=>{
      await asRole("service_role","INSERT INTO contact_messages(name,email,subject,message) VALUES ('Fixture','fixture@example.test','services','Synthetic request')");
      await asRole("service_role","INSERT INTO compare_runs(user_id,url_a,url_b,result) VALUES ($1,'https://a.invalid','https://b.invalid','{}')",[user]);
      expect((await asRole("service_role","SELECT share_token FROM compare_runs")).rows[0]).toHaveProperty("share_token",expect.any(String));
    });
  });

  it("preserves the supported public stats/read and private waitlist/insert paths",async()=>{
    await asRole("anon","INSERT INTO public.waitlist(email) VALUES ('browser@example.test')");
    await expect(asRole("anon","SELECT email FROM public.waitlist")).rejects.toMatchObject({code:"42501"});
    await expect(asRole("authenticated","SELECT value FROM public.app_stats")).resolves.toBeDefined();
  });

  it("exercises actual quota and billing RPCs with the complete table definitions",async()=>{
    await transaction(async()=>{
      expect((await asRole("service_role","SELECT reserve_scan_usage('fixture','2026-10-01',1) AS n")).rows).toEqual([{n:1}]);
      expect((await asRole("service_role","SELECT reserve_scan_usage('fixture','2026-10-01',1) AS n")).rows).toEqual([{n:-1}]);
      await asRole("service_role","SELECT release_scan_usage('fixture','2026-10-01')");
      await asRole("service_role","SELECT apply_billing_event($1,$2,$3,$4)",["a".repeat(64),user,{plan:"free",plan_expires_at:null,lemonsqueezy_subscription_id:null},{plan:"onetime"}]);
      const report={reportId:"00000000-0000-4000-8000-000000000003",url:"https://fixture.invalid",score:0,isFullReport:true,checks:[],scannedAt:"2026-10-27T00:00:00Z"};
      // Use a different ID so the historical fixture stays intact.
      await asRole("service_role","SELECT save_onetime_report($1,$2,$3)",[user,"00000000-0000-4000-8000-000000000003",report]);
      expect((await asRole("service_role","SELECT onetime_scan_count FROM profiles WHERE id=$1",[user])).rows).toEqual([{onetime_scan_count:1}]);
    });
  });

  it("exercises monitor and audit creation/completion RPCs after the full chain",async()=>{
    await transaction(async()=>{
      const monitor=await asRole("service_role","SELECT create_monitor_with_limit($1,'https://fixture.invalid','Fixture',1) AS value",[user]);
      const mid=(monitor.rows[0] as {value:{item:{id:string}}}).value.item.id;
      await asRole("service_role","SELECT * FROM save_monitor_snapshot($1,$2,0,'{}','fixture')",[mid,user]);
      const audit=await asRole("service_role","SELECT create_audit_with_limits($1,'fixture.invalid','[\"https://fixture.invalid\"]',1,1,1,NULL,NULL) AS value",[user]);
      const aid=(audit.rows[0] as {value:{id:string}}).value.id;
      const result=await asRole("service_role","SELECT * FROM save_audit_page_result($1,$2,$3)",[aid,user,{url:"https://fixture.invalid",score:0,status:"done"}]);
      expect(result.rows[0]).toMatchObject({scanned_pages:1,aggregate_score:0,complete:true});
    });
  });

  it("gives only the service role access to all eight application RPCs",async()=>{
    const result=await db.query<{name:string;service:boolean;anon:boolean;authenticated:boolean}>(`SELECT proname AS name,
      has_function_privilege('service_role',oid,'EXECUTE') AS service,
      has_function_privilege('anon',oid,'EXECUTE') AS anon,
      has_function_privilege('authenticated',oid,'EXECUTE') AS authenticated
      FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN
      ('reserve_scan_usage','release_scan_usage','apply_billing_event','save_onetime_report',
       'create_monitor_with_limit','save_monitor_snapshot','create_audit_with_limits','save_audit_page_result')`);
    expect(result.rows).toHaveLength(8);
    expect(result.rows.every(r=>r.service&&!r.anon&&!r.authenticated)).toBe(true);
  });

  it("retains expected foreign-key semantics without inventing a deletion policy",async()=>{
    await transaction(async()=>{
      await db.exec(`INSERT INTO reports(id,user_id,url,score,result) VALUES ('00000000-0000-4000-8000-000000000004','${user}','https://fixture.invalid',0,'{}');
        INSERT INTO monitored_urls(user_id,url) VALUES ('${user}','https://fixture.invalid');
        INSERT INTO audit_runs(user_id,domain) VALUES ('${user}','fixture.invalid');
        DELETE FROM auth.users WHERE id='${user}';`);
      expect((await db.query("SELECT user_id FROM reports WHERE id='00000000-0000-4000-8000-000000000004'")).rows).toEqual([{user_id:null}]);
      expect((await db.query("SELECT * FROM profiles")).rows).toHaveLength(0);
      expect((await db.query("SELECT * FROM monitored_urls")).rows).toHaveLength(0);
      // Historical audit ownership has no FK: this remains a lifecycle decision.
      expect((await db.query("SELECT user_id FROM audit_runs")).rows).toEqual([{user_id:user}]);
    });
  });

  it("preserves existing rows across the historical upgrade",async()=>{
    if(path!=="historical upgrade") return;
    expect((await db.query("SELECT result FROM reports WHERE id=$1",[reportId])).rows).toEqual([{result:{kept:true}}]);
    expect((await db.query("SELECT value FROM app_stats WHERE key='fixture'")).rows).toEqual([{value:7}]);
    expect((await db.query("SELECT message FROM contact_messages")).rows).toEqual([{message:"Keep this fixture"}]);
    expect((await db.query("SELECT event_id FROM webhook_events")).rows).toEqual([{event_id:"historical-fixture"}]);
  });

  it("fails install verification when an application RPC grant is missing",async()=>{
    await transaction(async()=>{
      await db.exec("REVOKE EXECUTE ON FUNCTION public.save_onetime_report(uuid,uuid,jsonb) FROM service_role");
      await expect(db.exec(steps[steps.length-1].sql)).rejects.toThrow("Expected eight service-only invoker RPCs");
    });
  });

  it("rejects bootstrapping an existing schema without modifying fixtures",async()=>{
    await expect(db.exec(steps[0].sql)).rejects.toThrow("Bootstrap requires an empty application schema");
    await db.exec("ROLLBACK");
    expect((await db.query("SELECT id FROM profiles")).rows).toEqual([{id:user}]);
  });
});
