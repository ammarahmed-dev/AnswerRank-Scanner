"use client";

import { useState } from "react";
import { getBrowserAccessToken } from "@/lib/supabase-browser-lazy";

export type UpgradePlan = "onetime" | "pro" | "agency";

const CHECKOUT_ERROR = "We couldn't open checkout. Please try again in a moment, or email hello@aeocheck.co if it keeps happening.";

type Props = {
  children?: React.ReactNode;
  className?: string;
  plan: UpgradePlan;
  disabled?: boolean;
  isCurrentPlan?: boolean;
  includedInPlan?: boolean;
  style?: React.CSSProperties;
};

export default function UpgradeButton({
  children = "Upgrade",
  className = "btn btn-primary",
  plan,
  disabled = false,
  isCurrentPlan = false,
  includedInPlan = false,
  style,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpgrade = async () => {
    if (loading || disabled || isCurrentPlan) return;
    setLoading(true);
    setError("");
    try {
      const token = await getBrowserAccessToken();
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
        setError(CHECKOUT_ERROR);
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
        setError(CHECKOUT_ERROR);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error("[upgrade] Unexpected error:", err);
      setError(CHECKOUT_ERROR);
      setLoading(false);
    }
  };

  return (
    <>
    <button
      type="button"
      onClick={isCurrentPlan ? undefined : handleUpgrade}
      disabled={loading || disabled || isCurrentPlan}
      className={className}
      style={isCurrentPlan ? { ...(style ?? {}), cursor: "default", opacity: 0.6 } : style}
    >
      {loading ? "Opening checkout…" : (isCurrentPlan && includedInPlan ? "Included in Pro" : children)}
    </button>
    {error && (
      <p role="alert" style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.4, color: "#ff8fa3" }}>
        {error}
      </p>
    )}
    </>
  );
}
