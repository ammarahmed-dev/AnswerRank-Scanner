"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Copy, Sparkles } from "lucide-react";
import LoadingState from "../components/LoadingState";
import ReportSectionNew from "../components/ReportSectionNew";
import { ScanResult } from "@/types/index";

const LOADING_STEP_TIMES = [900, 1800, 3000, 4700, 6800, 8600];

type ReportState = "loading" | "done" | "error";

export default function ReportClient() {
  const searchParams = useSearchParams();
  const sharedUrl = searchParams.get("url")?.trim() ?? "";
  const [state, setState] = useState<ReportState>("loading");
  const [loadingStep, setLoadingStep] = useState(0);
  const [report, setReport] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state !== "loading") return;
    setLoadingStep(0);
    const timers = LOADING_STEP_TIMES.map((ms, i) => setTimeout(() => setLoadingStep(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, [state]);

  useEffect(() => {
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
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: sharedUrl, includeAI: true }),
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
  }, [sharedUrl]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="min-h-screen">
      <header className="site-header">
        <a href="/" className="brand-lockup" aria-label="AnswerRank home">
          <span className="brand-mark"><Sparkles className="h-5 w-5" /></span>
          <span>
            <span className="brand-name">AnswerRank</span>
            <span className="brand-subtitle">AI visibility scanner</span>
          </span>
        </a>
        <nav className="site-nav" aria-label="Primary navigation">
          <a href="/#how">How it works</a>
          <a href="/#report">Report</a>
          <a href="/#pricing">Pricing</a>
          <a href="/#faq">FAQ</a>
        </nav>
        <div className="header-actions">
          {state === "done" && (
            <button type="button" onClick={handleCopyLink} className="header-pill report-share-button">
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy share link"}
            </button>
          )}
          <a href="/#scanner" className="btn btn-primary header-cta">Scan now</a>
        </div>
      </header>

      <section className="report-page" id="report-top">
        {state === "loading" && (
          <div className="launch-container py-8">
            <LoadingState step={loadingStep} />
          </div>
        )}

        {state === "error" && (
          <div className="launch-container py-8">
            <div className="error-banner">
              <AlertCircle className="h-5 w-5" />
              <div>
                <strong>Report unavailable</strong>
                <p>{errorMsg}</p>
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
    </main>
  );
}
