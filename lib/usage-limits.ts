import { createHash } from "node:crypto";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

const supabaseUrl = getSupabaseServerUrl();

export const GUEST_MONTHLY_SCAN_LIMIT = Number(process.env.GUEST_MONTHLY_SCAN_LIMIT ?? 1);
export const FREE_MONTHLY_SCAN_LIMIT = Number(process.env.FREE_MONTHLY_SCAN_LIMIT ?? 3);
export const PRO_MONTHLY_SCAN_LIMIT = Number(process.env.PRO_MONTHLY_SCAN_LIMIT ?? 1000000);

type UsageResult = {
  allowed: boolean;
  count: number;
  remaining: number;
  limit: number;
};

function currentMonthUsageDateKey() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

export function getClientKey(rawClientId: string | undefined, req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const userAgent = req.headers.get("user-agent") ?? "";
  const ip = forwardedFor ?? "unknown-ip";
  // IP+UA is the primary key — prevents trivial UUID rotation bypass of guest limits.
  // Fall back to client-supplied ID only when the IP is undetectable (e.g. local dev).
  const source = ip !== "unknown-ip" ? `${ip}:${userAgent}` : (rawClientId?.trim() || `unknown:${userAgent}`);
  return createHash("sha256").update(source).digest("hex");
}

export function getPlanLimit(plan: "guest" | "free" | "pro" | "agency") {
  if (plan === "guest") return GUEST_MONTHLY_SCAN_LIMIT;
  if (plan === "free") return FREE_MONTHLY_SCAN_LIMIT;
  return PRO_MONTHLY_SCAN_LIMIT;
}

async function readUsageCount(clientKey: string) {
  if (!hasSupabaseConfig()) return 0;

  const usageDate = currentMonthUsageDateKey();
  const params = new URLSearchParams({
    client_key: `eq.${clientKey}`,
    usage_date: `eq.${usageDate}`,
    select: "scan_count",
    limit: "1",
  });

  const readRes = await fetch(`${supabaseUrl}/rest/v1/scan_usage?${params.toString()}`, {
    headers: getSupabaseServiceHeaders(),
    cache: "no-store",
  });

  if (!readRes.ok) {
    const details = await readRes.text().catch(() => "");
    console.error("Supabase usage read failed:", details);
    return 0;
  }

  const rows = (await readRes.json()) as Array<{ scan_count: number }>;
  return rows[0]?.scan_count ?? 0;
}

export async function checkUsageLimit(clientKey: string, limit: number): Promise<UsageResult> {
  if (!hasSupabaseConfig()) {
    return { allowed: true, count: 0, remaining: limit, limit };
  }

  const currentCount = await readUsageCount(clientKey);

  if (currentCount >= limit) {
    return { allowed: false, count: currentCount, remaining: 0, limit };
  }

  return {
    allowed: true,
    count: currentCount,
    remaining: Math.max(0, limit - currentCount),
    limit,
  };
}

export async function incrementUsage(clientKey: string, nextCountHint?: number): Promise<number> {
  if (!hasSupabaseConfig()) return Math.max(0, nextCountHint ?? 1);

  const usageDate = currentMonthUsageDateKey();
  const currentCount = typeof nextCountHint === "number"
    ? Math.max(0, nextCountHint - 1)
    : await readUsageCount(clientKey);
  const nextCount = currentCount + 1;

  const writeRes = await fetch(`${supabaseUrl}/rest/v1/scan_usage`, {
    method: "POST",
    headers: {
      ...getSupabaseServiceHeaders(),
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
    return currentCount;
  }

  return nextCount;
}

export async function getUsageCount(clientKey: string) {
  return readUsageCount(clientKey);
}

