import { getSupabaseServerUrl, getSupabaseServiceHeaders, hasSupabaseConfig } from "@/lib/supabase-config";

const supabaseUrl = getSupabaseServerUrl();

export async function updateUserPlan(userId: string, plan: "free" | "pro" | "agency", email?: string | null) {
  if (!hasSupabaseConfig()) return false;

  const res = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      ...getSupabaseServiceHeaders(),
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

