import {afterAll,beforeAll,beforeEach,describe,expect,it} from "vitest";
import {PGlite} from "@electric-sql/pglite";
import {readFileSync,readdirSync} from "node:fs";
const directory=new URL("../supabase/migrations/",import.meta.url);
const migration=()=>readFileSync(new URL(readdirSync(directory).find(f=>f.endsWith("_atomic_onetime_report_save.sql"))!,directory),"utf8");
const owner="00000000-0000-4000-8000-000000000001",reportId="00000000-0000-4000-8000-000000000002";
const report=(id=reportId,url="https://example.invalid/page")=>({reportId:id,url,score:0,isFullReport:true,checks:[],scannedAt:"2026-10-25T00:00:00Z",methodology:{version:"fixture"},retest_count:0,max_retests:3});
let db:PGlite;
const save=(id=reportId,url="https://example.invalid/page",user=owner)=>db.query("SELECT public.save_onetime_report($1,$2,$3) AS id",[user,id,JSON.stringify(report(id,url))]);
const state=async()=>(await db.query("SELECT onetime_url,onetime_scan_count FROM public.profiles WHERE id=$1",[owner])).rows[0];
describe("atomic one-time report save SQL",()=>{
  beforeAll(async()=>{
    db=new PGlite();
    // Synthetic contract fixture, not a production schema export.
    await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;
      CREATE TABLE public.profiles(id uuid PRIMARY KEY,plan text NOT NULL,plan_expires_at timestamptz,onetime_url text,onetime_scan_count integer NOT NULL DEFAULT 0);
      CREATE TABLE public.reports(id uuid PRIMARY KEY,user_id uuid,url text NOT NULL,score integer NOT NULL,retest_count integer,max_retests integer,result jsonb NOT NULL,created_at timestamptz NOT NULL);
      REVOKE ALL ON public.profiles,public.reports FROM PUBLIC,anon,authenticated;
      GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
      GRANT SELECT,UPDATE ON public.profiles TO service_role;GRANT INSERT,SELECT ON public.reports TO service_role;`);
    await db.exec(migration());
  },30000);
  beforeEach(async()=>{await db.exec("RESET ROLE;TRUNCATE public.profiles,public.reports");await db.query("INSERT INTO public.profiles(id,plan) VALUES($1,'onetime')",[owner]);});
  afterAll(async()=>{await db?.close();});
  it("saves the owned report and locks/consumes its URL together, retaining the producing method and zero score",async()=>{
    await db.exec("SET ROLE service_role");try{
      expect((await save()).rows).toEqual([{id:reportId}]);
      expect(await state()).toEqual({onetime_url:"https://example.invalid/page",onetime_scan_count:1});
      expect((await db.query("SELECT user_id,score,result FROM public.reports")).rows).toEqual([{user_id:owner,score:0,result:report()}]);
    }finally{await db.exec("RESET ROLE");}
  });
  it("serializes queued same-URL saves at four total rights",async()=>{
    const outcomes=await Promise.allSettled(Array.from({length:5},(_,i)=>save(`00000000-0000-4000-8000-${String(i+10).padStart(12,"0")}`)));
    expect(outcomes.filter(x=>x.status==="fulfilled")).toHaveLength(4);
    expect(outcomes.filter(x=>x.status==="rejected")).toHaveLength(1);
    expect(await state()).toMatchObject({onetime_scan_count:4});
    expect((await db.query("SELECT count(*)::integer AS n FROM public.reports")).rows).toEqual([{n:4}]);
  });
  it("rejects a different URL after the first committed save",async()=>{
    await save();await expect(save("00000000-0000-4000-8000-000000000003","https://other.invalid")).rejects.toMatchObject({code:"40001"});
    expect(await state()).toMatchObject({onetime_scan_count:1});
  });
  it("does not consume a right when the report ID already exists",async()=>{
    await save();await expect(save()).rejects.toMatchObject({code:"23505"});expect(await state()).toMatchObject({onetime_scan_count:1});
  });
  it.each(["reports","profiles"])("rolls back both sides when a %s write is suppressed",async table=>{
    await db.exec(`CREATE OR REPLACE FUNCTION public.suppress_onetime_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;
      CREATE TRIGGER suppress_write BEFORE ${table==="reports"?"INSERT":"UPDATE"} ON public.${table} FOR EACH ROW EXECUTE FUNCTION public.suppress_onetime_write();`);
    try{await expect(save()).rejects.toThrow("affected no row");}finally{await db.exec(`DROP TRIGGER suppress_write ON public.${table}`);}
    expect(await state()).toEqual({onetime_url:null,onetime_scan_count:0});expect((await db.query("SELECT count(*)::integer AS n FROM public.reports")).rows).toEqual([{n:0}]);
  });
  it("rolls back a report insert if consumption raises an error and permits retry",async()=>{
    await db.exec(`CREATE FUNCTION public.fail_onetime_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected failure'; END $$;
      CREATE TRIGGER fail_write BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.fail_onetime_write();`);
    try{await expect(save()).rejects.toThrow("Injected failure");}finally{await db.exec("DROP TRIGGER fail_write ON public.profiles");}
    expect((await save()).rows).toEqual([{id:reportId}]);expect(await state()).toMatchObject({onetime_scan_count:1});
  });
  it.each(["plan='free'","plan='pro'","plan_expires_at=clock_timestamp()-interval '1 second'","onetime_scan_count=4"])("rejects stale or exhausted rights: %s",async patch=>{
    await db.exec(`UPDATE public.profiles SET ${patch}`);await expect(save()).rejects.toMatchObject({code:"40001"});
    expect((await db.query("SELECT count(*)::integer AS n FROM public.reports")).rows).toEqual([{n:0}]);
  });
  it("rejects a missing owner and preview-shaped payload without saving",async()=>{
    await expect(save(reportId,undefined,"00000000-0000-4000-8000-000000000099")).rejects.toMatchObject({code:"P0002"});
    await expect(db.query("SELECT public.save_onetime_report($1,$2,$3)",[owner,reportId,JSON.stringify({...report(),isFullReport:false})])).rejects.toMatchObject({code:"22023"});
  });
  it.each(["anon","authenticated"])("denies %s execution",async role=>{
    await db.exec(`SET ROLE ${role}`);try{await expect(save()).rejects.toMatchObject({code:"42501"});}finally{await db.exec("RESET ROLE");}
  });
});
