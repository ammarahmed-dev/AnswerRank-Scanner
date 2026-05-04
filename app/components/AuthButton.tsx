"use client";

import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { getSafeSupabaseUser, getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AuthButton() {
  const supabase = getSupabaseBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    async function loadAccountState() {
      try {
        const activeUser = await getSafeSupabaseUser(client);
        setUser(activeUser);
        setIsAdmin(false);

        if (!activeUser) return;

        const session = await client.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) return;

        const res = await fetch("/api/account", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (!res.ok) return;
        const account = (await res.json()) as { profile?: { isAdmin?: boolean } };
        setIsAdmin(Boolean(account.profile?.isAdmin));
      } catch {
        setUser(null);
        setIsAdmin(false);
      }
    }

    loadAccountState();

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAdmin(false);
      if (session?.user) {
        loadAccountState();
      }
    });

    return () => data.subscription.unsubscribe();
  }, [supabase]);

  if (!supabase) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  return (
    user ? (
      <div className="auth-account">
        {isAdmin && (
          <a href="/admin" title="Owner admin">
            <ShieldCheck className="h-4 w-4" /> Admin
          </a>
        )}
        <a href="/dashboard" title={user.email ?? "Dashboard"}>
          <LayoutDashboard className="h-4 w-4" /> Dashboard
        </a>
        <button type="button" onClick={handleLogout} aria-label="Log out">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    ) : (
      <a href="/login" className="btn btn-secondary auth-open-button">
        Log in
      </a>
    )
  );
}
