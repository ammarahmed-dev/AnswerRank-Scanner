import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync,readdirSync } from "node:fs";
const directory = new URL("../supabase/migrations/",import.meta.url);
const load = (suffix:string) => readFileSync(new URL(readdirSync(directory).find(f=>f.endsWith(suffix))!,directory),"utf8");
const owner="00000000-0000-4000-8000-000000000001",other="00000000-0000-4000-8000-000000000002";
let db:PGlite;
const urls=["https://example.invalid/a","https://example.invalid/b"];
const create=(monthly:number|null=1,rolling:number|null=null,user=owner,targets:unknown=urls)=>db.query<{result:{limit_reached:string|null;id?:string}}>("SELECT public.create_audit_with_limits($1,'example.invalid',$2,2,5,$3,$4,24) AS result",[user,JSON.stringify(targets),monthly,rolling]);
const seed=(age:string,user=owner)=>db.query("INSERT INTO public.audit_runs(user_id,domain,created_at) VALUES($1,'example.invalid',"+age+")",[user]);

describe("atomic audit creation SQL",()=>{
  beforeAll(async()=>{
    db=new PGlite();
    await db.exec(`CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;`);
    await db.exec(load("20260525_audit.sql"));
    await db.exec(`REVOKE ALL ON public.audit_runs FROM PUBLIC,anon,authenticated;
      GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;`);
    await db.exec(load("_atomic_audit_creation.sql"));
  },30000);
  beforeEach(async()=>{await db.exec("RESET ROLE; TRUNCATE public.audit_runs");});
  afterAll(async()=>{await db?.close();});
  it("upgrades a schema that already has the discovery field without changing its value",async()=>{
    const upgrade=new PGlite();
    try{
      await upgrade.exec(`CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS 'SELECT NULL::uuid';
        CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;`);
      await upgrade.exec(load("20260525_audit.sql"));
      await upgrade.exec(`ALTER TABLE public.audit_runs ADD COLUMN total_discovered integer DEFAULT 0;
        INSERT INTO public.audit_runs(domain,total_discovered) VALUES('legacy.example.invalid',42);`);
      await upgrade.exec(load("_atomic_audit_creation.sql"));
      expect((await upgrade.query("SELECT domain,total_discovered FROM public.audit_runs")).rows).toEqual([{domain:"legacy.example.invalid",total_discovered:42}]);
    }finally{await upgrade.close();}
  },30000);
  it("admits one queued monthly create and stores complete initial state",async()=>{
    await db.exec("SET ROLE service_role");
    try{
      // Queued single-connection calls, not a true contention benchmark.
      const results=await Promise.all([create(),create(),create()]);
      expect(results.map(r=>r.rows[0].result.limit_reached)).toEqual([null,"monthly","monthly"]);
      expect((await db.query("SELECT user_id,status,total_pages,scanned_pages,page_limit,total_discovered,urls,results FROM public.audit_runs")).rows).toEqual([{user_id:owner,status:"pending",total_pages:2,scanned_pages:0,page_limit:5,total_discovered:2,urls,results:[]}]);
    }finally{await db.exec("RESET ROLE");}
  });
  it("uses UTC calendar months rather than a rolling 30-day window",async()=>{
    await db.exec("SET TIME ZONE 'Pacific/Honolulu'");
    try{
      await seed("(date_trunc('month',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')-interval '1 microsecond'");
      expect((await create()).rows[0].result.limit_reached).toBeNull();
      expect((await create()).rows[0].result.limit_reached).toBe("monthly");
    }finally{await db.exec("SET TIME ZONE 'UTC'");}
  });
  it("enforces the rolling limit independently and retains uncapped behavior",async()=>{
    await seed("clock_timestamp()-interval '25 hours'");
    expect((await create(null,1)).rows[0].result.limit_reached).toBeNull();
    expect((await create(null,1)).rows[0].result.limit_reached).toBe("rolling");
    expect((await create(null,null)).rows[0].result.limit_reached).toBeNull();
  });
  it("does not share limits between accounts",async()=>{
    await create();expect((await create(1,null,other)).rows[0].result.limit_reached).toBeNull();
  });
  it("holds separate account advisory locks until rollback and rolls back rows",async()=>{
    await db.exec("BEGIN");
    try{await create();await create(1,null,other);expect((await db.query("SELECT count(*)::integer AS count FROM pg_locks WHERE locktype='advisory' AND pid=pg_backend_pid() AND granted")).rows).toEqual([{count:2}]);}
    finally{await db.exec("ROLLBACK");}
    expect((await db.query("SELECT count(*)::integer AS count FROM public.audit_runs")).rows).toEqual([{count:0}]);
  });
  it.each([[],["https://example.invalid/a","https://example.invalid/a"],[4],{},null])("rejects invalid discovered targets %j",async targets=>{
    await expect(create(1,null,owner,targets)).rejects.toMatchObject({code:"22023"});
  });
  it("rejects suppressed inserts without consuming the cap",async()=>{
    await db.exec(`CREATE FUNCTION public.suppress_audit_create() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;
      CREATE TRIGGER suppress_create BEFORE INSERT ON public.audit_runs FOR EACH ROW EXECUTE FUNCTION public.suppress_audit_create();`);
    try{await expect(create()).rejects.toThrow("affected no row");}finally{await db.exec("DROP TRIGGER suppress_create ON public.audit_runs");}
    expect((await create()).rows[0].result.limit_reached).toBeNull();
  });
  it("fails closed under repeatable-read isolation",async()=>{
    await db.exec("BEGIN ISOLATION LEVEL REPEATABLE READ");try{await expect(create()).rejects.toMatchObject({code:"25001"});}finally{await db.exec("ROLLBACK");}
  });
  it.each(["anon","authenticated"])("denies browser role %s",async role=>{
    await db.exec(`SET ROLE ${role}`);try{await expect(create()).rejects.toMatchObject({code:"42501"});}finally{await db.exec("RESET ROLE");}
  });
});
