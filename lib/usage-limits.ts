import { createHash } from "node:crypto";

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const GUEST_DAILY_SCAN_LIMIT = Number(process.env.GUEST_DAILY_SCAN_LIMIT ?? 5);
export const FREE_DAILY_SCAN_LIMIT = Number(process.env.FREE_DAILY_SCAN_LIMIT ?? 10);
export const PRO_DAILY_SCAN_LIMIT = Number(process.env.PRO_DAILY_SCAN_LIMIT ?? 1000000);

type UsageResult = {
  allowed: boolean;
  count: number;
  remaining: number;
  limit: number;
};

function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

function supabaseHeaders() {
  return {
    apikey: supabaseServiceRoleKey ?? "",
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    "Content-Type": "application/json",
  };
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function getClientKey(rawClientId: string | undefined, req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const userAgent = req.headers.get("user-agent") ?? "";
  const fallback = `${forwardedFor ?? "unknown-ip"}:${userAgent}`;
  const source = rawClientId?.trim() || fallback;
  return createHash("sha256").update(source).digest("hex");
}

export function getPlanLimit(plan: "guest" | "free" | "pro" | "agency") {
  if (plan === "guest") return GUEST_DAILY_SCAN_LIMIT;
  if (plan === "free") return FREE_DAILY_SCAN_LIMIT;
  return PRO_DAILY_SCAN_LIMIT;
}

export async function checkAndIncrementUsage(clientKey: string, limit: number): Promise<UsageResult> {
  if (!hasSupabaseConfig()) {
    return { allowed: true, count: 0, remaining: limit, limit };
  }

  const usageDate = todayKey();
  const params = new URLSearchParams({
    client_key: `eq.${clientKey}`,
    usage_date: `eq.${usageDate}`,
    select: "scan_count",
    limit: "1",
  });

  const readRes = await fetch(`${supabaseUrl}/rest/v1/scan_usage?${params.toString()}`, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });

  if (!readRes.ok) {
    const details = await readRes.text().catch(() => "");
    console.error("Supabase usage read failed:", details);
    return { allowed: true, count: 0, remaining: limit, limit };
  }

  const rows = (await readRes.json()) as Array<{ scan_count: number }>;
  const currentCount = rows[0]?.scan_count ?? 0;

  if (currentCount >= limit) {
    return { allowed: false, count: currentCount, remaining: 0, limit };
  }

  const nextCount = currentCount + 1;
  const writeRes = await fetch(`${supabaseUrl}/rest/v1/scan_usage`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      client_key: clientKey,
      usage_date: usageDate,
      scan_count: nextCount,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!writeRes.ok) {
    const details = await writeRes.text().catch(() => "");
    console.error("Supabase usage write failed:", details);
    return { allowed: true, count: currentCount, remaining: limit - currentCount, limit };
  }

  return {
    allowed: true,
    count: nextCount,
    remaining: Math.max(0, limit - nextCount),
    limit,
  };
}
