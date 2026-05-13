"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Radar } from "lucide-react";

const STEPS = [
  "Preparing scan",
  "Fetching website",
  "Reading metadata and schema",
  "Checking performance signals",
  "Generating AI insights",
  "Preparing report",
];

const STEP_WEIGHTS = {
  preparing: 5,
  fetching: 10,
  metadata: 15,
  content: 10,
  trust: 10,
  ai_analysis: 20,
  performance: 20,
  report: 10,
} as const;

type StepKey = keyof typeof STEP_WEIGHTS;

const STEP_ORDER: StepKey[] = [
  "preparing",
  "fetching",
  "metadata",
  "content",
  "trust",
  "ai_analysis",
  "performance",
  "report",
];

const STEP_TARGETS = STEP_ORDER.reduce((targets, key) => {
  const previous = STEP_ORDER
    .slice(0, STEP_ORDER.indexOf(key))
    .reduce((sum, item) => sum + STEP_WEIGHTS[item], 0);
  targets[key] = previous + STEP_WEIGHTS[key];
  return targets;
}, {} as Record<StepKey, number>);

const STEP_NUMBER_TO_KEY: Record<number, StepKey> = {
  1: "preparing",
  2: "fetching",
  3: "trust",
  4: "performance",
  5: "ai_analysis",
  6: "report",
};

const CREEP_INCREMENT = 0.03;
const CREEP_INTERVAL_MS = 100;
const MAX_BEFORE_RESULT = 95;
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

function getStepKey(progress: LoaderProgress): StepKey {
  const label = progress.label.toLowerCase();

  if (label.includes("fetch")) return "fetching";
  if (label.includes("metadata") || label.includes("schema")) return "trust";
  if (label.includes("pagespeed") || label.includes("performance")) return "performance";
  if (label.includes("ai") || label.includes("recommendation")) return "ai_analysis";
  if (label.includes("report")) return "report";
  return STEP_NUMBER_TO_KEY[progress.step] ?? "preparing";
}

function getVisualTarget(progress: LoaderProgress) {
  const stepKey = getStepKey(progress);
  const target = STEP_TARGETS[stepKey];

  if (progress.status === "complete" && stepKey === "report") {
    return MAX_BEFORE_RESULT;
  }

  return Math.min(target, MAX_BEFORE_RESULT);
}

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
  const targetProgress = useMemo(
    () => getVisualTarget(activeProgress),
    [activeProgress.label, activeProgress.status, activeProgress.step]
  );
  const [displayProgress, setDisplayProgress] = useState(() => Math.min(mappedProgressPercent, targetProgress));
  const [visualStepIndex, setVisualStepIndex] = useState(0);
  const progressPercent = isReportLoad ? mappedProgressPercent : Math.round(displayProgress);
  const statusText = activeProgress.status === "error"
    ? "Unavailable - continuing"
    : activeProgress.status === "skipped"
      ? "Skipped - continuing"
      : getDisplayLabel(activeProgress.label);

  useEffect(() => {
    if (isReportLoad) return;

    setDisplayProgress((prev) => Math.max(prev, Math.min(mappedProgressPercent, MAX_BEFORE_RESULT)));
  }, [isReportLoad, mappedProgressPercent]);

  useEffect(() => {
    if (isReportLoad || displayProgress >= targetProgress) return;

    const interval = window.setInterval(() => {
      setDisplayProgress((prev) => {
        const cappedTarget = Math.min(targetProgress, MAX_BEFORE_RESULT);
        const next = prev + CREEP_INCREMENT;

        if (next >= cappedTarget) {
          window.clearInterval(interval);
          return cappedTarget;
        }

        return next;
      });
    }, CREEP_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [displayProgress, isReportLoad, targetProgress]);

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

