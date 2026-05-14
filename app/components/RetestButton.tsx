"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import LoadingState from "./LoadingState";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ScanResult } from "@/types/index";

type ProgressStatus = "started" | "complete" | "skipped" | "error";
type LoaderProgress = {
  step: number;
  label: string;
  status: ProgressStatus;
};

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaderProgress, setLoaderProgress] = useState<LoaderProgress>({ step: 1, label: "Preparing scan", status: "started" });
  const [isClient, setIsClient] = useState(false);

  const remaining = Math.max(0, maxRetests - retestCount);
  const canRetest = isMasterAdmin || isProMonthly || (isUnlocked && remaining > 0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isUnlocked && !isProMonthly && !isMasterAdmin) {
    return null;
  }

  const handleRetest = async () => {
    setLoading(true);
    setError("");
    setLoaderProgress({ step: 1, label: "Preparing scan", status: "started" });

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
      let newReport: ScanResult | null = null;

      while (true) {
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
              label?: string;
              step?: number;
              status?: ProgressStatus;
              result?: ScanResult & { id?: string };
              reportId?: string;
              id?: string;
              report?: { id?: string };
              data?: { id?: string };
            };

            if (payload.type === "progress") {
              const nextLabel = payload.message || payload.label || "Running fresh scan...";
              setLoaderProgress({
                step: typeof payload.step === "number" ? payload.step : 1,
                label: nextLabel,
                status: payload.status || "started",
              });
            }

            if (payload.type === "result") {
              newReport = payload.result ?? null;
              if (!newReport) {
                setError("Scan completed, but the saved report was missing from the response.");
                setLoading(false);
                return;
              }

              newReportId =
                payload.result?.reportId ||
                payload.result?.id ||
                payload.reportId ||
                payload.id ||
                payload.report?.id ||
                payload.data?.id ||
                null;

              if (!newReportId) {
                setError("Scan completed, but the saved report ID was missing from the response.");
                setLoading(false);
                return;
              }

              if (newReportId) break;
            }

            if (payload.type === "error") {
              setError(payload.message || "Scan failed. Please try again.");
              setLoading(false);
              return;
            }
          } catch {
            continue;
          }
        }

        if (newReportId) break;
      }

      if (newReportId) {
        try {
          if (!newReport) {
            throw new Error("Missing saved report payload.");
          }
          sessionStorage.setItem(`aeocheck_report:${newReportId}`, JSON.stringify(newReport));
          sessionStorage.setItem(`aeocheck_report:${newReport.url}`, JSON.stringify(newReport));
          window.location.assign(`/report?id=${encodeURIComponent(newReportId)}`);
        } catch (err) {
          console.error("[retest] save or redirect failed:", err);
          setError("Scan completed, but the new report could not be opened. Please check your dashboard.");
          setLoading(false);
        }
        return;
      }

      console.error("[retest] no reportId found in SSE stream");
      setError("Scan completed but report could not be loaded. Please check your dashboard.");
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
          <>
            <svg
              className="retest-spinner"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Scanning...
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 1 0 .49-3" />
            </svg>
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

      {isClient && loading && createPortal(
        <div className="loading-overlay" role="dialog" aria-modal="true" aria-label="Running AI visibility scan">
          <div className="loading-dialog">
            <LoadingState progress={loaderProgress} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
