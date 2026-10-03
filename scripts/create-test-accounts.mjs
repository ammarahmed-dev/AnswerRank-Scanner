/**
 * One-off script: creates test auth users + profiles in Supabase.
 * Run: node scripts/create-test-accounts.mjs
 *
 * Creates:
 *   onetime@test.aeocheck.co  → plan: onetime (one-time purchase)
 *   pro@test.aeocheck.co      → plan: pro     (active subscription)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
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
  } catch {
    // env may already be set
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_PASSWORD = process.env.TEST_ACCOUNT_PASSWORD;
if (!TEST_PASSWORD || TEST_PASSWORD.length < 12) {
  console.error("Set TEST_ACCOUNT_PASSWORD (12+ chars) before running this script");
  process.exit(1);
}

const ACCOUNTS = [
  {
    email: "onetime@test.aeocheck.co",
    plan: "onetime",
    label: "One-time (Starter)",
    profileExtra: {
      plan_expires_at: null,
      lemonsqueezy_subscription_id: null,
    },
  },
  {
    email: "pro@test.aeocheck.co",
    plan: "pro",
    label: "Pro (active subscription)",
    profileExtra: {
      plan_expires_at: null,
      lemonsqueezy_subscription_id: "test-sub-pro-12345",
      lemonsqueezy_portal_url: "https://app.lemonsqueezy.com/my-orders",
    },
  },
];

async function upsertUser(email) {
  // Try to find existing user first
  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existing = listData?.users?.find((u) => u.email === email);

  if (existing) {
    console.log(`  [exists] ${email} (id: ${existing.id})`);
    return existing;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (error) {
    console.error(`  [error] creating ${email}:`, error.message);
    return null;
  }

  console.log(`  [created] ${email} (id: ${data.user.id})`);
  return data.user;
}

async function upsertProfile(userId, email, plan, extra) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };

  // Step 1: insert with plan=free to satisfy the check constraint on INSERT
  const insertRes = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({
      id: userId,
      email,
      plan: "free",
      welcome_email_sent: true,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!insertRes.ok) {
    const body = await insertRes.text().catch(() => "");
    // 409 conflict = row already exists, that's fine
    if (!body.includes("duplicate")) {
      console.warn(`  [warn] insert step for ${email}: ${insertRes.status} ${body}`);
    }
  }

  // Step 2: PATCH to set actual plan (bypasses INSERT check constraint)
  const patchRes = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ plan, updated_at: new Date().toISOString(), ...extra }),
    }
  );

  if (!patchRes.ok) {
    const body = await patchRes.text().catch(() => "");
    console.error(`  [error] patching profile for ${email}: ${patchRes.status} ${body}`);
    return false;
  }

  console.log(`  [profile] ${email} → plan: ${plan}`);
  return true;
}

async function verifyAccounts(emails) {
  console.log("\nVerifying accounts in Supabase...");
  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });

  for (const email of emails) {
    const user = listData?.users?.find((u) => u.email === email);
    if (!user) {
      console.log(`  [MISSING] auth user: ${email}`);
      continue;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("plan, lemonsqueezy_subscription_id")
      .eq("id", user.id)
      .single();

    if (!profiles) {
      console.log(`  [MISSING] profile for: ${email}`);
    } else {
      console.log(`  [OK] ${email} | plan: ${profiles.plan} | sub_id: ${profiles.lemonsqueezy_subscription_id ?? "none"}`);
    }
  }
}

async function main() {
  console.log("=== AEOCheck Test Account Creator ===\n");
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Password for all accounts: ${TEST_PASSWORD}\n`);

  for (const account of ACCOUNTS) {
    console.log(`--- ${account.label} ---`);
    const user = await upsertUser(account.email);
    if (!user) continue;
    await upsertProfile(user.id, account.email, account.plan, account.profileExtra);
  }

  await verifyAccounts(ACCOUNTS.map((a) => a.email));

  console.log("\n=== Done ===");
  console.log("\nTest account credentials:");
  console.log("  Password (all accounts):", TEST_PASSWORD);
  for (const a of ACCOUNTS) {
    console.log(`  ${a.label}: ${a.email}`);
  }
  console.log("\nLogin at: https://www.aeocheck.co/login");
}

main().catch((e) => { console.error(e); process.exit(1); });
