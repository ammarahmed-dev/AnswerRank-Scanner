"use client";

import { useState } from "react";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Props = {
  children?: React.ReactNode;
  className?: string;
  reportId?: string;
  reportUrl?: string;
  checkoutType?: "full_report" | "pro_plan";
  disabled?: boolean;
};

export default function UpgradeButton({
  children = "Upgrade plan",
  className = "btn btn-primary",
  reportId,
  reportUrl,
  checkoutType = "full_report",
  disabled = false,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    const supabase = getSupabaseBrowserClient();
    const token = (await getSafeSupabaseSession(supabase))?.access_token;

    if (!token) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      return;
    }

    if (checkoutType === "full_report" && !reportId) {
      if (window.location.pathname !== "/") {
        window.location.href = "/#scanner";
      } else {
        document.getElementById("scanner")?.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    setLoading(true);
    try {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkoutType,
          reportId,
          reportUrl,
          returnTo,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout failed.");
      window.location.href = data.url;
    } catch (error) {
      console.error("Checkout start failed:", error);
      setLoading(false);
    }
  };

  return (
    <button type="button" onClick={handleUpgrade} disabled={loading || disabled} className={className}>
      {loading ? "Opening checkout" : children}
    </button>
  );
}

