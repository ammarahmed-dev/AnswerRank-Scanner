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
const userId = "b49b0a50-f955-4ea3-ac41-5e24c2ea30a6"; // onetime test user

// Try PATCH like the webhook does
const patchRes = await fetch(`${URL}/rest/v1/profiles?id=eq.${userId}`, {
  method: "PATCH",
  headers: {
    apikey: KEY,
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  },
  body: JSON.stringify({ plan: "onetime", plan_expires_at: null }),
});
console.log("PATCH plan=onetime status:", patchRes.status);
const patchBody = await patchRes.text();
console.log("PATCH body:", patchBody);

// If that fails, check constraint via pg_catalog
const constraintRes = await fetch(
  `${URL}/rest/v1/information_schema.check_constraints?constraint_schema=eq.public&select=constraint_name,check_clause`,
  {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
    },
  }
);
console.log("constraint query status:", constraintRes.status);
const constraints = await constraintRes.text();
console.log("constraints:", constraints.slice(0, 2000));
