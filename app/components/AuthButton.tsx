"use client";

import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { getSafeSupabaseUser, getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function AuthButton() {
  const supabase = getSupabaseBrowserClient();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!supabase) return;

    getSafeSupabaseUser(supabase)
      .then(setUser)
      .catch(() => setUser(null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, [supabase]);

  if (!supabase) return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    user ? (
      <div className="auth-account">
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
