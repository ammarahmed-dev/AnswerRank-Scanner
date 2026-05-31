import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

type AuthUser = {
  id: string;
  email?: string;
};

export type AuthContext = {
  user: AuthUser | null;
  plan: "guest" | "free" | "onetime" | "pro" | "agency";
};

const supabaseUrl = getSupabaseServerUrl();

function normalizePlan(value: unknown): AuthContext["plan"] {
  if (value === "pro" || value === "agency" || value === "onetime") return value;
  return "free";
}

export async function getUserPlan(userId: string): Promise<AuthContext["plan"]> {
  if (!hasSupabaseConfig()) return "free";
  const params = new URLSearchParams({
    id: `eq.${userId}`,
    select: "plan,plan_expires_at",
    limit: "1",
  });
  const res = await fetch(`${supabaseUrl}/rest/v1/profiles?${params.toString()}`, {
    headers: getSupabaseServiceHeaders(),
    cache: "no-store",
  });
  if (!res.ok) return "free";
  const rows = (await res.json()) as Array<{ plan?: string; plan_expires_at?: string | null }>;
  const row = rows[0];
  if (!row) return "free";
  if (row.plan_expires_at && new Date(row.plan_expires_at) < new Date()) return "free";
  return normalizePlan(row.plan);
}

export async function getAuthContext(req: Request): Promise<AuthContext> {
  if (!hasSupabaseConfig()) return { user: null, plan: "guest" };

  const auth = req.headers.get("authorization");
  const token = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return { user: null, plan: "guest" };

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!userRes.ok) return { user: null, plan: "guest" };

  const userData = (await userRes.json()) as { id?: string; email?: string };
  if (!userData.id) return { user: null, plan: "guest" };

  const user: AuthUser = { id: userData.id, email: userData.email };

  await fetch(`${supabaseUrl}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      ...getSupabaseServiceHeaders(),
      Prefer: "resolution=ignore-duplicates",
    },
    body: JSON.stringify({
      id: user.id,
      email: user.email ?? null,
      plan: "free",
    }),
  }).catch(() => null);

  try {
    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=created_at,plan,welcome_email_sent`,
      {
        headers: getSupabaseServiceHeaders(),
        cache: "no-store",
      }
    );
    const profiles = profileRes.ok
      ? ((await profileRes.json()) as Array<{ welcome_email_sent?: boolean | null }>)
      : [];
    const profile = profiles[0];
    const shouldSendWelcome = profile && profile.welcome_email_sent === false;

    if (shouldSendWelcome && user.email) {
      await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}`, {
        method: "PATCH",
        headers: {
          ...getSupabaseServiceHeaders(),
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ welcome_email_sent: true }),
      });

      const secret = process.env.INTERNAL_API_SECRET;
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aeocheck.co";
      if (secret) {
        fetch(`${baseUrl}/api/emails/welcome`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify({ email: user.email, userId: user.id }),
        }).catch((err) => console.error("[welcome-email] failed:", err));
      }
    }
  } catch (err) {
    console.error("[welcome-email] trigger failed:", err);
  }

  return { user, plan: await getUserPlan(user.id) };
}
