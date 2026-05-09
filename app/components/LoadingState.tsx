"use client";

import { Check, Loader2, Radar } from "lucide-react";

const STEPS = [
  "Fetching website",
  "Reading metadata",
  "Checking schema",
  "Analyzing AI search readiness",
  "Checking content clarity",
  "Preparing report",
];

interface Props {
  step: number;
  mode?: "scan" | "report";
}

export default function LoadingState({ step, mode = "scan" }: Props) {
  const isReportLoad = mode === "report";
  const currentStep = Math.min(step, STEPS.length - 1);
  const progress = Math.min(92, Math.max(8, Math.round(((step + 0.25) / STEPS.length) * 100)));

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
              {isReportLoad ? "Preparing your one-page audit view." : `Current step: ${STEPS[currentStep]}`}
            </p>
          </div>
        </div>
        <span className="badge">{isReportLoad ? "Report view" : `${progress}% complete`}</span>
      </div>

      <div className="loading-progress">
        <div className="score-bar-fill" style={{ width: `${isReportLoad ? 62 : progress}%` }} />
      </div>

      {isReportLoad ? (
        <div className="saved-report-loading">
          <span>Loading score, checks, recommendations, and report details.</span>
        </div>
      ) : <div className="loading-step-grid">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === currentStep;

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
