type AuthUser = {
  id: string;
  email?: string;
};

export type AuthContext = {
  user: AuthUser | null;
  plan: "guest" | "free" | "pro" | "agency";
};

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

function normalizePlan(value: unknown): AuthContext["plan"] {
  if (value === "pro" || value === "agency") return value;
  return "free";
}

export async function getAuthContext(req: Request): Promise<AuthContext> {
  if (!hasSupabaseConfig()) return { user: null, plan: "guest" };

  const auth = req.headers.get("authorization");
  const token = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return { user: null, plan: "guest" };

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseServiceRoleKey ?? "",
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
      ...supabaseHeaders(),
      Prefer: "resolution=ignore-duplicates",
    },
    body: JSON.stringify({
      id: user.id,
      email: user.email ?? null,
      plan: "free",
    }),
  }).catch(() => null);

  const params = new URLSearchParams({
    id: `eq.${user.id}`,
    select: "plan",
    limit: "1",
  });

  const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles?${params.toString()}`, {
    headers: supabaseHeaders(),
    cache: "no-store",
  });

  if (!profileRes.ok) return { user, plan: "free" };

  const rows = (await profileRes.json()) as Array<{ plan?: string }>;
  return { user, plan: normalizePlan(rows[0]?.plan) };
}
