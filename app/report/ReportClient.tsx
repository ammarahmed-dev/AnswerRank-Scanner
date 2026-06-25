"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import LoadingState from "../components/LoadingState";
import ReportSectionNew from "../components/ReportSectionNew";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ScanResult } from "@/types/index";

const LOADING_STEP_TIMES = [900, 1800, 3000, 4700, 6800, 8600];
const CLIENT_STORAGE_KEY = "aeocheck_client_id_v1";

type ReportState = "loading" | "done" | "error";

export default function ReportClient() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("id")?.trim() ?? "";
  const sharedUrl = searchParams.get("url")?.trim() ?? "";
  const retestOfReportId = searchParams.get("retestOf")?.trim() ?? "";
  const forceRefresh = searchParams.get("payment") === "1";
  const [state, setState] = useState<ReportState>("loading");
  const [loadingStep, setLoadingStep] = useState(0);
  const [report, setReport] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  function getClientId() {
    const storedClientId = localStorage.getItem(CLIENT_STORAGE_KEY);
    const nextClientId = storedClientId || crypto.randomUUID();
    localStorage.setItem(CLIENT_STORAGE_KEY, nextClientId);
    return nextClientId;
  }

  useEffect(() => {
    if (state !== "loading") return;
    setLoadingStep(0);
    const timers = LOADING_STEP_TIMES.map((ms, i) => setTimeout(() => setLoadingStep(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, [state]);

  useEffect(() => {
    if (reportId) {
      if (forceRefresh) {
        sessionStorage.removeItem(`aeocheck_report:${reportId}`);
      }
      const cachedById = sessionStorage.getItem(`aeocheck_report:${reportId}`);
      if (cachedById && !forceRefresh) {
        try {
          setReport(JSON.parse(cachedById) as ScanResult);
          setState("done");
          return;
        } catch {
          sessionStorage.removeItem(`aeocheck_report:${reportId}`);
        }
      }

      const controller = new AbortController();

      async function loadSavedReport() {
        setState("loading");
        setErrorMsg("");

        try {
          const supabase = getSupabaseBrowserClient();
          const token = (await getSafeSupabaseSession(supabase))?.access_token;
          const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: controller.signal,
          });
          const data = (await res.json()) as ScanResult & { error?: string };

          if (!res.ok || data.error) {
            setErrorMsg(data.error ?? "Report not found.");
            setState("error");
            return;
          }

          sessionStorage.setItem(`aeocheck_report:${reportId}`, JSON.stringify(data));
          const cachedCompetitors = sessionStorage.getItem(`aeocheck_competitors:${reportId}`);
          if (cachedCompetitors) {
            data.competitorUrls = JSON.parse(cachedCompetitors) as string[];
          }
          setReport(data);
          setState("done");
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setErrorMsg("Could not load this report. Please try again.");
          setState("error");
        }
      }

      loadSavedReport();
      return () => controller.abort();
    }

    if (!sharedUrl) {
      setErrorMsg("This report link is missing a website URL.");
      setState("error");
      return;
    }

    const cached = sessionStorage.getItem(`aeocheck_report:${sharedUrl}`);
    if (cached && !retestOfReportId) {
      try {
        setReport(JSON.parse(cached) as ScanResult);
        setState("done");
        return;
      } catch {
        sessionStorage.removeItem(`aeocheck_report:${sharedUrl}`);
      }
    }

    const controller = new AbortController();

    async function runScan() {
      setState("loading");
      setErrorMsg("");

      try {
        const timeout = setTimeout(() => controller.abort(), 65000);
        const supabase = getSupabaseBrowserClient();
        const token = (await getSafeSupabaseSession(supabase))?.access_token;
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ url: sharedUrl, includeAI: true, clientId: getClientId(), retestOfReportId }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        // Non-2xx errors return JSON before the stream starts
        if (!res.ok) {
          const errData = (await res.json()) as { error?: string };
          setErrorMsg(errData.error ?? "Something went wrong. Please try again.");
          setState("error");
          return;
        }

        // Scan returns text/event-stream - read it like HomePageClient does
        const reader = res.body?.getReader();
        if (!reader) {
          setErrorMsg("Could not read scan response.");
          setState("error");
          return;
        }
        const decoder = new TextDecoder();
        let buffer = "";
        let result: ScanResult | null = null;

        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const dataLine = part.split("\n").find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            try {
              const event = JSON.parse(dataLine.slice(5).trim()) as { type: string; message?: string; result?: ScanResult };
              if (event.type === "error") {
                setErrorMsg(event.message ?? "Scan failed.");
                setState("error");
                return;
              }
              if (event.type === "result" && event.result) {
                result = event.result;
                break outer;
              }
            } catch { /* skip malformed line */ }
          }
        }

        if (!result) {
          setErrorMsg("Scan finished but no report was generated.");
          setState("error");
          return;
        }

        const cachedCompetitors = sessionStorage.getItem(`aeocheck_competitors:${sharedUrl}`);
        if (cachedCompetitors) {
          result.competitorUrls = JSON.parse(cachedCompetitors) as string[];
        }
        sessionStorage.setItem(`aeocheck_report:${result.url}`, JSON.stringify(result));
        if (result.reportId) {
          sessionStorage.setItem(`aeocheck_report:${result.reportId}`, JSON.stringify(result));
          window.history.replaceState(null, "", `/report?id=${result.reportId}`);
        }
        setReport(result);
        setState("done");
      } catch (err) {
        setErrorMsg(
          err instanceof DOMException && err.name === "AbortError"
            ? "The scan took too long. External AI or performance APIs may be slow. Please try again."
            : "Network error. Please check your connection and try again."
        );
        setState("error");
      }
    }

    runScan();
    return () => controller.abort();
  }, [forceRefresh, reportId, retestOfReportId, sharedUrl]);

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <section className="report-page" id="report-top">
        {state === "loading" && (
          <div className="report-loading-wrap">
            <div className="launch-container">
              <LoadingState step={loadingStep} mode={reportId ? "report" : "scan"} />
            </div>
          </div>
        )}

        {state === "error" && (
          <div className="report-loading-wrap">
            <div className="launch-container">
              <div className="error-banner">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <strong>Report unavailable</strong>
                  <p>{errorMsg}</p>
                  <small>Open a valid report link or scan the URL again from the homepage.</small>
                </div>
                <a href="/#scanner" className="btn btn-danger">Scan a URL</a>
              </div>
            </div>
          </div>
        )}

        {state === "done" && report && (
          <div className="animate-fade-in-up">
            <ReportSectionNew report={report} onReset={() => { window.location.href = "/#scanner"; }} />
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}


