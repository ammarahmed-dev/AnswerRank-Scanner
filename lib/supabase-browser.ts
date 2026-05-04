"use client";

import { createClient } from "@supabase/supabase-js";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (client) return client;

  client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}

function isInvalidRefreshTokenError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("refresh token");
}

export async function getSafeSupabaseSession(supabase: SupabaseClient | null): Promise<Session | null> {
  if (!supabase) return null;

  try {
    const { data } = await supabase.auth.getSession();
    return data.session ?? null;
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => null);
      return null;
    }

    throw error;
  }
}

export async function getSafeSupabaseUser(supabase: SupabaseClient | null): Promise<User | null> {
  if (!supabase) return null;

  try {
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      await supabase.auth.signOut({ scope: "local" }).catch(() => null);
      return null;
    }

    throw error;
  }
}
