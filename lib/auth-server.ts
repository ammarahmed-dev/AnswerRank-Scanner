import { readBoundedText } from "@/lib/bounded-body";
import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

type AuthUser = { id: string; email?: string };
export type AuthContext = {
  user: AuthUser | null;
  plan: "guest" | "free" | "onetime" | "pro" | "agency";
  onetimeUrl?: string | null;
  onetimeScanCount?: number;
  /** A presented credential could not be authoritatively verified. Never run guest/free work. */
  unavailable?: true;
};
type Profile = {
  plan: Exclude<AuthContext["plan"], "guest">;
  plan_expires_at?: string | null;
  welcome_email_sent?: boolean | null;
  onetime_url?: string | null;
  onetime_scan_count?: number | null;
};
const supabaseUrl = getSupabaseServerUrl();
class VerificationError extends Error {
  constructor(readonly code: "configuration" | "http" | "invalid_response" | "profile_missing" | "deadline" | "cancelled", readonly status?: number) {
    super("Account verification is temporarily unavailable.");
    this.name = "VerificationError";
  }
}

async function withDeadline<T>(work: (signal: AbortSignal) => Promise<T>, caller?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const signal = caller ? AbortSignal.any([caller, controller.signal]) : controller.signal;
  const timer = setTimeout(() => controller.abort(), 10_000);
  let abort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    abort = () => reject(new VerificationError(caller?.aborted ? "cancelled" : "deadline"));
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
  try { return await Promise.race([work(signal), aborted]); }
  finally {
    clearTimeout(timer);
    if (abort) signal.removeEventListener("abort", abort);
  }
}
async function request(path: string, signal: AbortSignal, init: RequestInit = {}): Promise<Response> {
  signal.throwIfAborted();
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init, headers: init.headers ?? getSupabaseServiceHeaders(), cache: "no-store", redirect: "error", signal,
  });
  if (signal.aborted) {
    void response.body?.cancel().catch(() => undefined);
    signal.throwIfAborted();
  }
  return response;
}
async function json(response: Response, limit: number, signal: AbortSignal): Promise<unknown> {
  if (!response.ok) {
    void response.body?.cancel().catch(() => undefined);
    throw new VerificationError("http", response.status);
  }
  return JSON.parse(await readBoundedText(response, limit, signal)) as unknown;
}
function profileRows(value: unknown): Profile | null {
  if (!Array.isArray(value) || value.length > 1) throw new VerificationError("invalid_response");
  if (!value.length) return null;
  const row = value[0];
  if (!row || typeof row !== "object" || Array.isArray(row) ||
      !["free", "onetime", "pro", "agency"].includes(row.plan) ||
      (row.plan_expires_at != null && (typeof row.plan_expires_at !== "string" || !Number.isFinite(Date.parse(row.plan_expires_at)))) ||
      (row.welcome_email_sent != null && typeof row.welcome_email_sent !== "boolean") ||
      (row.onetime_url != null && typeof row.onetime_url !== "string") ||
      (row.onetime_scan_count != null && (!Number.isSafeInteger(row.onetime_scan_count) || row.onetime_scan_count < 0))) {
    throw new VerificationError("invalid_response");
  }
  return row as Profile;
}
function effectivePlan(profile: Profile): AuthContext["plan"] {
  return profile.plan_expires_at && new Date(profile.plan_expires_at) < new Date() ? "free" : profile.plan;
}
export async function getUserPlan(userId: string): Promise<AuthContext["plan"]> {
  if (!hasSupabaseConfig()) throw new VerificationError("configuration");
  return withDeadline(async signal => {
    const params = new URLSearchParams({ id: `eq.${userId}`, select: "plan,plan_expires_at", limit: "1" });
    const profile = profileRows(await json(await request(`/rest/v1/profiles?${params}`, signal), 16_384, signal));
    if (!profile) throw new VerificationError("profile_missing");
    return effectivePlan(profile);
  });
}

export async function getAuthContext(req: Request): Promise<AuthContext> {
  const header = req.headers.get("authorization");
  const token = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const guest: AuthContext = { user: null, plan: "guest" };
  if (!token) return guest;
  const unavailable = (): AuthContext => ({ ...guest, unavailable: true });
  if (!hasSupabaseConfig()) return unavailable();
  let verified: AuthContext | undefined;
  try {
    return await withDeadline(async signal => {
      const userResponse = await request("/auth/v1/user", signal, { headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", Authorization: `Bearer ${token}`,
      } });
      if ([400, 401, 403].includes(userResponse.status)) {
        void userResponse.body?.cancel().catch(() => undefined);
        return guest;
      }
      const data = await json(userResponse, 65_536, signal);
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new VerificationError("invalid_response");
      const userData = data as Record<string, unknown>;
      if (typeof userData.id !== "string" || !userData.id || userData.id.length > 256 ||
          (userData.email != null && typeof userData.email !== "string")) throw new VerificationError("invalid_response");
      const user: AuthUser = { id: userData.id, ...(typeof userData.email === "string" ? { email: userData.email } : {}) };
      const profilePath = `/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=plan,plan_expires_at,welcome_email_sent,onetime_url,onetime_scan_count&limit=1`;
      const readProfile = async () => profileRows(await json(await request(profilePath, signal), 16_384, signal));
      let profile = await readProfile();
      if (!profile) {
        // One idempotent bootstrap only after an authoritative empty read. No mutation retry.
        const created = await request("/rest/v1/profiles", signal, {
          method: "POST", headers: { ...getSupabaseServiceHeaders(), Prefer: "resolution=ignore-duplicates" },
          body: JSON.stringify({ id: user.id, email: user.email ?? null, plan: "free" }),
        });
        void created.body?.cancel().catch(() => undefined);
        if (!created.ok) throw new VerificationError("http", created.status);
        profile = await readProfile();
        if (!profile) throw new VerificationError("profile_missing");
      }
      verified = { user, plan: effectivePlan(profile), onetimeUrl: profile.onetime_url ?? null, onetimeScanCount: profile.onetime_scan_count ?? 0 };
      // Existing best-effort welcome path is not an authority for account rights.
      if (profile.welcome_email_sent === false && user.email) {
        try {
          const marked = await request(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`, signal, {
            method: "PATCH", headers: { ...getSupabaseServiceHeaders(), Prefer: "return=minimal" },
            body: JSON.stringify({ welcome_email_sent: true }),
          });
          void marked.body?.cancel().catch(() => undefined);
          signal.throwIfAborted();
          const secret = process.env.INTERNAL_API_SECRET;
          const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.aeocheck.co").replace(/\/$/, "");
          if (secret) void fetch(`${baseUrl}/api/emails/welcome`, {
            method: "POST", signal: AbortSignal.timeout(5_000),
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
            body: JSON.stringify({ email: user.email, userId: user.id }),
          }).then(response => { void response.body?.cancel().catch(() => undefined); }).catch(() => console.error("[welcome-email] request failed"));
        } catch { console.error("[welcome-email] marker request failed"); }
      }
      return verified;
    }, req.signal);
  } catch (error) {
    if (verified) return verified;
    console.error("[auth] verification unavailable", error instanceof VerificationError ? { code: error.code, status: error.status } : { code: "request_failed" });
    return unavailable();
  }
}
