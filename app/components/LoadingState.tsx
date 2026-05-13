"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Radar } from "lucide-react";

const STEPS = [
  "Preparing scan",
  "Fetching website",
  "Reading metadata and schema",
  "Checking performance signals",
  "Generating AI insights",
  "Preparing report",
];

const TOTAL_ESTIMATED_MS = 30000;

type ProgressStatus = "started" | "complete" | "skipped" | "error";
type LoaderProgress = {
  step: number;
  label: string;
  status: ProgressStatus;
};

interface Props {
  progress?: LoaderProgress;
  progressByStepAndStatus?: Record<string, number>;
  step?: number;
  mode?: "scan" | "report";
}

const DEFAULT_PROGRESS_MAP: Record<string, number> = {
  "1:started": 10,
  "1:complete": 18,
  "2:started": 25,
  "2:complete": 33,
  "3:started": 40,
  "3:complete": 50,
  "4:started": 58,
  "4:complete": 66,
  "4:skipped": 66,
  "4:error": 66,
  "5:started": 75,
  "5:complete": 84,
  "5:skipped": 84,
  "5:error": 84,
  "6:started": 92,
  "6:complete": 100,
};

function getDisplayLabel(label: string) {
  return label.replace(/Running PageSpeed (analysis|check)/gi, "Checking performance signals");
}

export default function LoadingState({ progress, progressByStepAndStatus, step, mode = "scan" }: Props) {
  const isReportLoad = mode === "report";
  const fallbackStep = typeof step === "number" ? Math.max(1, Math.min(6, step + 1)) : 1;
  const activeProgress = progress ?? { step: fallbackStep, label: STEPS[fallbackStep - 1] ?? "Preparing scan", status: "started" as ProgressStatus };
  const stepNumber = Math.max(1, Math.min(6, activeProgress.step));
  const progressKey = `${stepNumber}:${activeProgress.status}`;
  const map = progressByStepAndStatus ?? DEFAULT_PROGRESS_MAP;
  const mappedProgressPercent = map[progressKey] ?? map[`${stepNumber}:started`] ?? 10;
  const isScanComplete = !isReportLoad && stepNumber === STEPS.length && activeProgress.status === "complete";
  const [visualStepIndex, setVisualStepIndex] = useState(0);
  const displayProgress = isReportLoad
    ? mappedProgressPercent
    : Math.round((visualStepIndex / STEPS.length) * 95);
  const progressPercent = displayProgress;
  const statusText = activeProgress.status === "error"
    ? "Unavailable - continuing"
    : activeProgress.status === "skipped"
      ? "Skipped - continuing"
      : STEPS[visualStepIndex] ?? getDisplayLabel(activeProgress.label);

  useEffect(() => {
    if (isReportLoad) return;

    const intervalMs = Math.floor(TOTAL_ESTIMATED_MS / STEPS.length);
    const timer = window.setInterval(() => {
      setVisualStepIndex((prev) => {
        if (prev >= STEPS.length - 2) {
          window.clearInterval(timer);
          return prev;
        }

        return prev + 1;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isReportLoad]);

  useEffect(() => {
    if (!isScanComplete) return;

    setVisualStepIndex(STEPS.length);
  }, [isScanComplete]);

  return (
    <section className="surface loading-card mx-auto w-full max-w-[820px] animate-fade-in-up">
      <div className="loading-card-header">
        <div className="loading-title-row">
          <div className="brand-mark relative flex-shrink-0">
            <Radar className="h-5 w-5" />
            <Loader2 className="absolute h-9 w-9 animate-spin opacity-40" />
          </div>
          <div className="min-w-0">
            <h3 className="section-heading">{isReportLoad ? "Loading report" : "Running AI visibility scan"}</h3>
            <p className="section-kicker mt-1">
              {isReportLoad ? "Preparing your one-page audit view." : `Current step: ${statusText}`}
            </p>
          </div>
        </div>
        <span className="badge">{isReportLoad ? "Report view" : `${progressPercent}% complete`}</span>
      </div>

      <div className="loading-progress">
        <div className="score-bar-fill" style={{ width: `${isReportLoad ? 62 : displayProgress}%` }} />
      </div>

      {isReportLoad ? (
        <div className="saved-report-loading">
          <span>Loading score, checks, recommendations, and report details.</span>
        </div>
      ) : <div className="loading-step-grid">
        {STEPS.map((label, i) => {
          const done = i < visualStepIndex;
          const active = i === visualStepIndex && !isScanComplete;

          return (
            <div key={label} className={`panel-soft flex items-center gap-3 p-4 ${active ? "border-cyan-300/30 bg-cyan-300/10" : ""}`}>
              <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border ${done ? "border-cyan-300 bg-cyan-300 text-slate-950" : active ? "border-cyan-300 bg-cyan-300/10 text-cyan-200" : "border-white/10 bg-white/5 text-slate-500"}`}>
                {done ? <Check className="h-3.5 w-3.5" /> : active ? <span className="h-2 w-2 rounded-full bg-cyan-300" /> : null}
              </div>
              <span className={`text-sm font-semibold ${active ? "text-shimmer" : done ? "text-slate-300" : "text-slate-500"}`}>{label}</span>
            </div>
          );
        })}
      </div>}
    </section>
  );
}

