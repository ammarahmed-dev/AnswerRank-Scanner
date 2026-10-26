"use client";

import { trustedCheckoutUrl } from "@/lib/checkout-url";
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
        console.error("[upgrade] Checkout unavailable");
        setError(CHECKOUT_ERROR);
        setLoading(false);
        return;
      }
      const checkoutUrl = trustedCheckoutUrl(data.checkoutUrl);
      if (!checkoutUrl) {
        console.error("[upgrade] Invalid checkout destination");
        setError(CHECKOUT_ERROR);
        setLoading(false);
        return;
      }
      window.location.href = checkoutUrl;
    } catch {
      console.error("[upgrade] Request failed");
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
