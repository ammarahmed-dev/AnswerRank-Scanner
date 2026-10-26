import { readBoundedText } from "@/lib/bounded-body";
import { createHash } from "node:crypto";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

const supabaseUrl = getSupabaseServerUrl();

export const GUEST_MONTHLY_SCAN_LIMIT = Number(process.env.GUEST_MONTHLY_SCAN_LIMIT ?? 1);
export const FREE_MONTHLY_SCAN_LIMIT = Number(process.env.FREE_MONTHLY_SCAN_LIMIT ?? 3);
export const PRO_MONTHLY_SCAN_LIMIT = Number(process.env.PRO_MONTHLY_SCAN_LIMIT ?? 1000000);

type UsageResult = {
  allowed: boolean;
  /** Storage could not verify usage; callers must return 503, not a quota warning. */
  unavailable?: boolean;
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

// Keep the deadline active through decoded-body consumption. Do not retry mutations:
// a lost response can follow a committed reservation/release in the database.
async function withUsageResponse<T>(path: string, init: RequestInit, consume: (response: Response, signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let response: Response | undefined;
  try {
    response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      ...init,
      headers: getSupabaseServiceHeaders(),
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    controller.signal.throwIfAborted();
    return await consume(response, controller.signal);
  } finally {
    // Cancel unread error/release bodies rather than draining untrusted data.
    await response?.body?.cancel().catch(() => undefined);
    clearTimeout(timer);
  }
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

  const rows: unknown = await withUsageResponse(`scan_usage?${params.toString()}`, {}, async (response, signal) => {
    if (!response.ok) {
      console.error("Supabase usage read failed:", response.status);
      throw new Error("Usage storage is unavailable.");
    }
    return JSON.parse(await readBoundedText(response, 4096, signal)) as unknown;
  });
  if (!Array.isArray(rows) || rows.length > 1) throw new Error("Invalid usage storage response.");
  const count: unknown = rows.length ? rows[0]?.scan_count : 0;
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 0) throw new Error("Invalid usage storage response.");
  return count;
}

export async function getUsageCount(clientKey: string) {
  return readUsageCount(clientKey);
}


/**
 * Atomically reserves one unit of usage before doing the work, so concurrent requests cannot
 * exceed the limit. Call commitUsage() on success and releaseUsage() on failure.
 * The verified database RPC is required. Missing or failed functions never fall back
 * to a read-then-write path that can overrun limits under concurrent requests.
 */
export async function reserveUsage(clientKey: string, limit: number): Promise<UsageReservation> {
  const usageDate = currentMonthUsageDateKey();
  const unavailable = (): UsageReservation => ({ allowed: false, unavailable: true, count: 0, remaining: 0, limit, reserved: false, usageDate });
  if (!Number.isSafeInteger(limit) || limit < 1) return unavailable();
  if (!hasSupabaseConfig()) {
    if (process.env.NODE_ENV === "production") return unavailable();
    return { allowed: true, count: 0, remaining: limit, limit, reserved: false, usageDate };
  }

  try {
    return await withUsageResponse("rpc/reserve_scan_usage", {
      method: "POST",
      body: JSON.stringify({ p_client_key: clientKey, p_usage_date: usageDate, p_limit: limit }),
    }, async (res, signal): Promise<UsageReservation> => {
      if (!res.ok) {
        console.error("Supabase reserve_scan_usage failed:", res.status);
        return unavailable();
      }
      const count: unknown = JSON.parse(await readBoundedText(res, 4096, signal));
      if (count === -1) {
        return { allowed: false, count: limit, remaining: 0, limit, reserved: false, usageDate };
      }
      if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 1 || count > limit) return unavailable();
      return { allowed: true, count, remaining: Math.max(0, limit - count), limit, reserved: true, usageDate };
    });
  } catch (err) {
    console.error("Supabase reserve_scan_usage error:", err instanceof Error ? err.name : "unknown");
    return unavailable();
  }
}

/** Atomic reservations are already counted; production commits require one. */
export async function commitUsage(_clientKey: string, reservation: UsageReservation): Promise<void> {
  if (!reservation.allowed || reservation.unavailable) throw new Error("Usage reservation was not accepted.");
  if (reservation.reserved) return;
  if (!hasSupabaseConfig() && process.env.NODE_ENV !== "production") return;
  throw new Error("An atomic usage reservation is required.");
}

/** Gives back an atomic reservation when the work failed. */
export async function releaseUsage(clientKey: string, reservation: UsageReservation): Promise<void> {
  if (!reservation.reserved || !hasSupabaseConfig()) return;
  try {
    await withUsageResponse("rpc/release_scan_usage", {
      method: "POST",
      body: JSON.stringify({ p_client_key: clientKey, p_usage_date: reservation.usageDate }),
    }, async res => {
      if (!res.ok) console.error("Supabase release_scan_usage failed:", res.status);
    });
  } catch (err) {
    console.error("Supabase release_scan_usage error:", err instanceof Error ? err.name : "unknown");
  }
}
