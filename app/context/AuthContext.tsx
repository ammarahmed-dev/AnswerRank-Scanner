"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";

export type UserPlan = "guest" | "free" | "onetime" | "pro" | "agency";

type AuthState = {
  user: { id: string; email: string } | null;
  plan: UserPlan;
  isAdmin: boolean;
  remaining: number | null;
  unlimited: boolean;
  loading: boolean;
  portalUrl: string | null;
};

type AuthContextValue = AuthState & {
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  plan: "guest",
  isAdmin: false,
  remaining: null,
  unlimited: false,
  loading: true,
  portalUrl: null,
  refresh: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    plan: "guest",
    isAdmin: false,
    remaining: null,
    unlimited: false,
    loading: true,
    portalUrl: null,
  });

  const supabase = getSupabaseBrowserClient();

  const fetchAccount = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/account", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        setState({ user: null, plan: "guest", isAdmin: false, remaining: null, unlimited: false, loading: false, portalUrl: null });
        return;
      }
      const data = (await res.json()) as {
        profile: { id: string; email: string; plan: UserPlan; isAdmin?: boolean; portalUrl?: string | null };
        usage: { remaining: number | null; unlimited: boolean };
      };
      setState({
        user: { id: data.profile.id, email: data.profile.email },
        plan: data.profile.plan,
        isAdmin: Boolean(data.profile.isAdmin),
        remaining: data.usage.remaining,
        unlimited: data.usage.unlimited,
        loading: false,
        portalUrl: data.profile.portalUrl ?? null,
      });
    } catch {
      setState({ user: null, plan: "guest", isAdmin: false, remaining: null, unlimited: false, loading: false, portalUrl: null });
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const token = (await getSafeSupabaseSession(supabase))?.access_token;
    if (!token) {
      setState({ user: null, plan: "guest", isAdmin: false, remaining: null, unlimited: false, loading: false, portalUrl: null });
      return;
    }
    await fetchAccount(token);
  }, [supabase, fetchAccount]);

  useEffect(() => {
    if (!supabase) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    const client = supabase;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.access_token) {
        setState({ user: null, plan: "guest", isAdmin: false, remaining: null, unlimited: false, loading: false, portalUrl: null });
        return;
      }
      await fetchAccount(session.access_token);
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchAccount]);

  const value: AuthContextValue = { ...state, refresh };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
