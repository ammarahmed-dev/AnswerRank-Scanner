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

export type UsageReservation = UsageResult & {
  /** True when the unit was reserved atomically in the database and must be released on failure. */
  reserved: boolean;
  usageDate: string;
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
  // IP+UA is the primary key - prevents trivial UUID rotation bypass of guest limits.
  // Fall back to client-supplied ID only when the IP is undetectable (e.g. local dev).
  const source = ip !== "unknown-ip" ? `${ip}:${userAgent}` : (rawClientId?.trim() || `unknown:${userAgent}`);
  return createHash("sha256").update(source).digest("hex");
}

export function getPlanLimit(plan: "guest" | "free" | "onetime" | "pro" | "agency") {
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


async function callRpc(name: string, args: Record<string, unknown>): Promise<Response> {
  return fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: getSupabaseServiceHeaders(),
    body: JSON.stringify(args),
    cache: "no-store",
  });
}

/**
 * Atomically reserves one unit of usage before doing the work, so concurrent requests cannot
 * exceed the limit. Call commitUsage() on success and releaseUsage() on failure.
 * Falls back to the legacy read-then-write check while the `reserve_scan_usage` function
 * (supabase/migrations/20261003_atomic_scan_usage.sql) is not installed.
 */
export async function reserveUsage(clientKey: string, limit: number): Promise<UsageReservation> {
  const usageDate = currentMonthUsageDateKey();
  if (!hasSupabaseConfig()) {
    return { allowed: true, count: 0, remaining: limit, limit, reserved: false, usageDate };
  }

  try {
    const res = await callRpc("reserve_scan_usage", {
      p_client_key: clientKey,
      p_usage_date: usageDate,
      p_limit: limit,
    });
    if (res.ok) {
      const count = Number(await res.json());
      if (!Number.isFinite(count) || count < 0) {
        return { allowed: false, count: limit, remaining: 0, limit, reserved: false, usageDate };
      }
      return { allowed: true, count, remaining: Math.max(0, limit - count), limit, reserved: true, usageDate };
    }
    if (res.status !== 404) {
      console.error("Supabase reserve_scan_usage failed:", res.status);
    }
  } catch (err) {
    console.error("Supabase reserve_scan_usage error:", err instanceof Error ? err.message : err);
  }

  const legacy = await checkUsageLimit(clientKey, limit);
  return { ...legacy, reserved: false, usageDate };
}

/** Records successful usage. A no-op for atomic reservations (already counted). */
export async function commitUsage(clientKey: string, reservation: UsageReservation): Promise<void> {
  if (reservation.reserved) return;
  await incrementUsage(clientKey, reservation.count + 1);
}

/** Gives back an atomic reservation when the work failed. */
export async function releaseUsage(clientKey: string, reservation: UsageReservation): Promise<void> {
  if (!reservation.reserved || !hasSupabaseConfig()) return;
  try {
    const res = await callRpc("release_scan_usage", { p_client_key: clientKey, p_usage_date: reservation.usageDate });
    if (!res.ok) console.error("Supabase release_scan_usage failed:", res.status);
  } catch (err) {
    console.error("Supabase release_scan_usage error:", err instanceof Error ? err.message : err);
  }
}
