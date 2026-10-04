"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import LoadingState from "./LoadingState";
import { getBrowserAccessToken } from "@/lib/supabase-browser-lazy";
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
  onError?: (msg: string) => void;
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
  onError,
}: Props) {
  const [loading, setLoading] = useState(false);
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
    onError?.("");
    setLoaderProgress({ step: 1, label: "Preparing scan", status: "started" });

    try {
      const token = await getBrowserAccessToken();

      const checkRes = await fetch(`/api/reports/${reportId}/retest`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      let checkData: { error?: string; message?: string } = {};
      try {
        checkData = (await checkRes.json()) as { error?: string; message?: string };
      } catch {
        onError?.("Retest is currently unavailable. Please try again.");
        setLoading(false);
        return;
      }

      if (!checkRes.ok) {
        onError?.(checkData.message || checkData.error || "Retest is unavailable.");
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
        onError?.("Scan failed. Please try again.");
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
                onError?.("Scan completed, but the saved report was missing from the response.");
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
                console.warn("[retest] result event had no reportId, redirecting to dashboard");
                window.location.assign("/dashboard");
                return;
              }

              if (newReportId) break;
            }

            if (payload.type === "error") {
              onError?.(payload.message || "Scan failed. Please try again.");
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
        if (newReport) {
          try {
            sessionStorage.setItem(`aeocheck_report:${newReportId}`, JSON.stringify(newReport));
            sessionStorage.setItem(`aeocheck_report:${newReport.url}`, JSON.stringify(newReport));
          } catch {
            // sessionStorage failure is non-fatal
          }
        }
        window.location.assign(`/report?id=${encodeURIComponent(newReportId)}`);
        return;
      }

      console.warn("[retest] SSE stream ended without a result event, redirecting to dashboard");
      window.location.assign("/dashboard");
    } catch (err) {
      console.error("[retest] error:", err);
      onError?.("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
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

      {isClient && loading && createPortal(
        <div className="loading-overlay" role="dialog" aria-modal="true" aria-label="Running AI visibility scan">
          <div className="loading-dialog">
            <LoadingState progress={loaderProgress} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
