/**
 * Applies SQL migration via Supabase REST API using pg_catalog queries.
 * Uses the service role key which has DDL privileges.
 */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {}
}
loadEnv();

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Try via Management API if available
const sql = `
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'onetime', 'pro', 'agency'));
`;

console.log("Applying migration via Supabase...");

// Try using a custom RPC or the pg REST endpoint
const res = await fetch(`${URL}/rest/v1/`, {
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
});
console.log("REST status:", res.status);

// Check if there's a way to execute SQL
// The Supabase DB can be accessed via the management API
const projectRef = URL.replace("https://", "").split(".")[0];
console.log("Project ref:", projectRef);
console.log("\nCannot apply DDL via REST API without a custom function.");
console.log("Please run this SQL in the Supabase SQL Editor:");
console.log("https://supabase.com/dashboard/project/" + projectRef + "/sql/new");
console.log("\n--- SQL to run ---");
console.log(sql);
console.log("--- end SQL ---");
