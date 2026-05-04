"use client";

import { useState } from "react";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Props = {
  children?: React.ReactNode;
  className?: string;
};

export default function UpgradeButton({ children = "Upgrade plan", className = "btn btn-primary" }: Props) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    const supabase = getSupabaseBrowserClient();
    const token = (await getSafeSupabaseSession(supabase))?.access_token;

    if (!token) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout failed.");
      window.location.href = data.url;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not start checkout.");
      setLoading(false);
    }
  };

  return (
    <button type="button" onClick={handleUpgrade} disabled={loading} className={className}>
      {loading ? "Opening checkout" : children}
    </button>
  );
}
