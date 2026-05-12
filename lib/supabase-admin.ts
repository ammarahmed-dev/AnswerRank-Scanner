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

export async function updateUserPlan(userId: string, plan: "free" | "pro" | "agency", email?: string | null) {
  if (!hasSupabaseConfig()) return false;

  const res = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      ...supabaseHeaders(),
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: userId,
      email: email ?? null,
      plan,
      updated_at: new Date().toISOString(),
    }),
  });

  return res.ok;
}

