"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import LoadingState from "../components/LoadingState";
import ReportSectionNew from "../components/ReportSectionNew";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ScanResult } from "@/types/index";

const LOADING_STEP_TIMES = [900, 1800, 3000, 4700, 6800, 8600];
const CLIENT_STORAGE_KEY = "answerrank_client_id_v1";

type ReportState = "loading" | "done" | "error";

export default function ReportClient() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get("id")?.trim() ?? "";
  const sharedUrl = searchParams.get("url")?.trim() ?? "";
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
      const cachedById = sessionStorage.getItem(`answerrank_report:${reportId}`);
      if (cachedById) {
        try {
          setReport(JSON.parse(cachedById) as ScanResult);
          setState("done");
          return;
        } catch {
          sessionStorage.removeItem(`answerrank_report:${reportId}`);
        }
      }

      const controller = new AbortController();

      async function loadSavedReport() {
        setState("loading");
        setErrorMsg("");

        try {
          const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}`, {
            signal: controller.signal,
          });
          const data = (await res.json()) as ScanResult & { error?: string };

          if (!res.ok || data.error) {
            setErrorMsg(data.error ?? "Report not found.");
            setState("error");
            return;
          }

          sessionStorage.setItem(`answerrank_report:${reportId}`, JSON.stringify(data));
          sessionStorage.setItem(`answerrank_report:${data.url}`, JSON.stringify(data));
          setReport(data);
          setState("done");
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setErrorMsg("Could not load this saved report. Please try again.");
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

    const cached = sessionStorage.getItem(`answerrank_report:${sharedUrl}`);
    if (cached) {
      try {
        setReport(JSON.parse(cached) as ScanResult);
        setState("done");
        return;
      } catch {
        sessionStorage.removeItem(`answerrank_report:${sharedUrl}`);
      }
    }

    const controller = new AbortController();

    async function runScan() {
      setState("loading");
      setErrorMsg("");

      try {
        const timeout = setTimeout(() => controller.abort(), 65000);
        const supabase = getSupabaseBrowserClient();
        const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ url: sharedUrl, includeAI: true, clientId: getClientId() }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const data = (await res.json()) as ScanResult & { error?: string };
        if (!res.ok || data.error) {
          setErrorMsg(data.error ?? "Something went wrong. Please try again.");
          setState("error");
          return;
        }

        sessionStorage.setItem(`answerrank_report:${data.url}`, JSON.stringify(data));
        if (data.reportId) {
          sessionStorage.setItem(`answerrank_report:${data.reportId}`, JSON.stringify(data));
          window.history.replaceState(null, "", `/report?id=${data.reportId}`);
        }
        setReport(data);
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
  }, [reportId, sharedUrl]);

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <section className="report-page" id="report-top">
        {state === "loading" && (
          <div className="launch-container py-8">
            <LoadingState step={loadingStep} mode={reportId ? "saved-report" : "scan"} />
          </div>
        )}

        {state === "error" && (
          <div className="launch-container py-8">
            <div className="error-banner">
              <AlertCircle className="h-5 w-5" />
              <div>
                <strong>Report unavailable</strong>
                <p>{errorMsg}</p>
                <small>Open a valid shared report link or scan the URL again from the homepage.</small>
              </div>
              <a href="/#scanner" className="btn btn-danger">Scan a URL</a>
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
