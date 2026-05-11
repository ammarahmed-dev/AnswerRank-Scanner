"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";

type ConfirmState = "confirming" | "confirmed" | "pending" | "error";

export default function UpgradeSuccessClient() {
  const [state, setState] = useState<ConfirmState>("confirming");
  const [message, setMessage] = useState("We are confirming your payment and unlocking your report.");
  const params = useSearchParams();
  const sessionId = params.get("session_id")?.trim() ?? "";
  const reportId = params.get("report_id")?.trim() ?? "";
  const returnTo = useMemo(
    () => params.get("return_to")?.trim() || (reportId ? `/report?id=${encodeURIComponent(reportId)}` : "/report"),
    [params, reportId]
  );

  useEffect(() => {
    let cancelled = false;

    async function confirmUnlock() {
      if (!sessionId) {
        if (!cancelled) {
          setState("pending");
          setMessage("Payment completed. If your report is still locked, refresh in a few seconds.");
        }
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const token = (await getSafeSupabaseSession(supabase))?.access_token;
      if (!token) {
        if (!cancelled) {
          setState("pending");
          setMessage("Sign in to finish unlocking your report.");
        }
        return;
      }

      try {
        const res = await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId, reportId: reportId || undefined }),
        });

        const data = (await res.json()) as { unlocked?: boolean; confirmed?: boolean; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Could not confirm payment.");

        if (!cancelled) {
          if (data.unlocked) {
            setState("confirmed");
            setMessage("Payment confirmed. Your Full Report is unlocked.");
          } else if (data.confirmed) {
            setState("pending");
            setMessage("Payment received. Unlock is finishing in the background.");
          } else {
            setState("pending");
            setMessage("Payment is processing. Refresh in a few seconds if your report is still locked.");
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setState("error");
          setMessage(err instanceof Error ? err.message : "Could not confirm payment.");
        }
      }
    }

    void confirmUnlock();
    return () => {
      cancelled = true;
    };
  }, [reportId, sessionId]);

  return (
    <section className="auth-page">
      <div className="surface dashboard-error">
        <CheckCircle2 className="h-8 w-8 text-emerald-300" />
        <strong>Upgrade successful</strong>
        <p>{message}</p>
        <a href={returnTo} className="btn btn-primary">
          {state === "confirming" ? "Confirming payment" : "Open unlocked report"}
        </a>
      </div>
    </section>
  );
}
