"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Props = {
  reportId: string;
  url: string;
  retestCount: number;
  maxRetests: number;
  isUnlocked: boolean;
  isProMonthly?: boolean;
  isMasterAdmin?: boolean;
  compact?: boolean;
};

export default function RetestButton({
  reportId,
  url,
  retestCount,
  maxRetests,
  isUnlocked,
  isProMonthly = false,
  isMasterAdmin = false,
  compact = false,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const remaining = Math.max(0, maxRetests - retestCount);
  const canRetest = isMasterAdmin || isProMonthly || (isUnlocked && remaining > 0);

  if (!isUnlocked && !isProMonthly && !isMasterAdmin) {
    return null;
  }

  const handleRetest = async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const token = (await getSafeSupabaseSession(supabase))?.access_token;
      const checkRes = await fetch(`/api/reports/${reportId}/retest`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const checkData = (await checkRes.json()) as { error?: string; message?: string };
      if (!checkRes.ok) {
        setError(checkData.message || checkData.error || "Retest is unavailable.");
        setLoading(false);
        return;
      }

      const scanRes = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          url,
          includeAI: true,
          retestOfReportId: reportId,
        }),
      });

      if (!scanRes.ok || !scanRes.body) {
        setError("Scan failed. Please try again.");
        setLoading(false);
        return;
      }

      const reader = scanRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let newReportId: string | null = null;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const eventLines = part
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          const dataLines = eventLines
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.replace(/^data:\s?/, ""));
          if (!dataLines.length) continue;

          const payloadRaw = dataLines.join("\n");

          try {
            const payload = JSON.parse(payloadRaw) as {
              type?: string;
              message?: string;
              result?: { reportId?: string; id?: string };
              reportId?: string;
              id?: string;
              report?: { id?: string };
              data?: { id?: string };
            };

            if (payload.type === "error") {
              setError(payload.message || "Scan failed. Please try again.");
              setLoading(false);
              return;
            }

            if (payload.type === "result") {
              newReportId =
                payload.result?.reportId ||
                payload.result?.id ||
                payload.reportId ||
                payload.id ||
                payload.report?.id ||
                payload.data?.id ||
                null;

              if (newReportId) break outer;
            }
          } catch {
            continue;
          }
        }
      }

      if (newReportId) {
        router.push(`/report?id=${newReportId}`);
        return;
      }

      console.error("[retest] no reportId found in SSE stream");
      setError("Scan completed but could not load report. Please check your dashboard.");
      setLoading(false);
    } catch (err) {
      console.error("[retest] error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="retest-wrapper">
      <button
        type="button"
        onClick={handleRetest}
        disabled={loading || !canRetest}
        className={`retest-btn${compact ? " retest-btn-compact" : ""}`}
      >
        {loading ? (
          "Scanning..."
        ) : (
          <>
            <RotateCcw className="h-4 w-4" />
            Retest this URL
          </>
        )}
      </button>

      {!isMasterAdmin && !isProMonthly && isUnlocked && !compact && (
        <span className="retest-count">
          {remaining > 0 ? `${remaining} retest${remaining === 1 ? "" : "s"} remaining` : "No retests remaining"}
        </span>
      )}

      {isProMonthly && !compact && <span className="retest-count">Unlimited retests</span>}
      {error && <p className="retest-error">{error}</p>}
    </div>
  );
}
