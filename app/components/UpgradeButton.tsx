"use client";

import { useState } from "react";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";

export type UpgradePlan = "onetime" | "pro" | "agency";

type Props = {
  children?: React.ReactNode;
  className?: string;
  plan: UpgradePlan;
  disabled?: boolean;
  isCurrentPlan?: boolean;
  includedInPlan?: boolean;
};

export default function UpgradeButton({
  children = "Upgrade",
  className = "btn btn-primary",
  plan,
  disabled = false,
  isCurrentPlan = false,
  includedInPlan = false,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (loading || disabled || isCurrentPlan) return;
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const token = (await getSafeSupabaseSession(supabase))?.access_token;
      if (!token) {
        const returnTo = typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/";
        window.location.href = `/login?next=${encodeURIComponent(returnTo)}`;
        return;
      }
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { checkoutUrl?: string; error?: string };
      if (!res.ok || !data.checkoutUrl) {
        console.error("[upgrade] Checkout error:", data.error);
        setLoading(false);
        return;
      }
      try {
        const checkoutUrl = new URL(data.checkoutUrl);
        if (!checkoutUrl.hostname.endsWith("lemonsqueezy.com")) {
          throw new Error("Unexpected checkout hostname");
        }
        window.location.href = data.checkoutUrl;
      } catch (e) {
        console.error("[upgrade] Invalid checkout URL:", e);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error("[upgrade] Unexpected error:", err);
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={isCurrentPlan ? undefined : handleUpgrade}
      disabled={loading || disabled || isCurrentPlan}
      className={className}
      style={isCurrentPlan ? { cursor: "default", opacity: 0.6 } : undefined}
    >
      {loading ? "Opening checkout…" : (isCurrentPlan && includedInPlan ? "Included in Pro" : children)}
    </button>
  );
}
