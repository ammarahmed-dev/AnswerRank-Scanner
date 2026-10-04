"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getBrowserAccessToken, loadSupabaseBrowserClient, supabaseConfigured } from "@/lib/supabase-browser-lazy";

export type UserPlan = "guest" | "free" | "onetime" | "pro" | "agency";

type AuthState = {
  user: { id: string; email: string } | null;
  plan: UserPlan;
  isAdmin: boolean;
  remaining: number | null;
  unlimited: boolean;
  loading: boolean;
  portalUrl: string | null;
  onetimeScanCount: number;
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
  onetimeScanCount: 0,
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
    onetimeScanCount: 0,
  });

  const fetchAccount = useCallback(async (token: string) => {
    try {
      const res = await fetch("/api/account", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        setState({ user: null, plan: "guest", isAdmin: false, remaining: null, unlimited: false, loading: false, portalUrl: null, onetimeScanCount: 0 });
        return;
      }
      const data = (await res.json()) as {
        profile: { id: string; email: string; plan: UserPlan; isAdmin?: boolean; portalUrl?: string | null; onetimeScanCount?: number };
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
        onetimeScanCount: data.profile.onetimeScanCount ?? 0,
      });
    } catch {
      setState({ user: null, plan: "guest", isAdmin: false, remaining: null, unlimited: false, loading: false, portalUrl: null, onetimeScanCount: 0 });
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!supabaseConfigured) return;
    const token = await getBrowserAccessToken();
    if (!token) {
      setState({ user: null, plan: "guest", isAdmin: false, remaining: null, unlimited: false, loading: false, portalUrl: null, onetimeScanCount: 0 });
      return;
    }
    await fetchAccount(token);
  }, [fetchAccount]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    // supabase-js loads after first paint; onAuthStateChange still fires INITIAL_SESSION on subscribe.
    loadSupabaseBrowserClient()
      .then((client) => {
        if (cancelled) return;
        if (!client) {
          setState((prev) => ({ ...prev, loading: false }));
          return;
        }
        const {
          data: { subscription },
        } = client.auth.onAuthStateChange(async (_event, session) => {
          if (!session?.access_token) {
            setState({ user: null, plan: "guest", isAdmin: false, remaining: null, unlimited: false, loading: false, portalUrl: null, onetimeScanCount: 0 });
            return;
          }
          await fetchAccount(session.access_token);
        });
        unsubscribe = () => subscription.unsubscribe();
      })
      .catch(() => {
        if (!cancelled) setState((prev) => ({ ...prev, loading: false }));
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [fetchAccount]);

  const value: AuthContextValue = { ...state, refresh };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
