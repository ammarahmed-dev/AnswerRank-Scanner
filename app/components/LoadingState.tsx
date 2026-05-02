"use client";

import { Check, Loader2, Radar } from "lucide-react";

const STEPS = [
  "Fetching website",
  "Reading metadata",
  "Checking schema",
  "Analyzing content clarity",
  "Generating AI visibility recommendations",
  "Preparing report",
];

interface Props {
  step: number;
}

export default function LoadingState({ step }: Props) {
  const currentStep = Math.min(step, STEPS.length - 1);
  const progress = Math.min(96, Math.max(8, Math.round(((step + 0.35) / STEPS.length) * 100)));

  return (
    <section className="surface card-pad mx-auto w-full max-w-[820px] animate-fade-in-up">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="brand-mark relative">
            <Radar className="h-5 w-5" />
            <Loader2 className="absolute h-9 w-9 animate-spin opacity-40" />
          </div>
          <div>
            <h3 className="section-heading">Running AI visibility scan</h3>
            <p className="section-kicker mt-1">Current step: {STEPS[currentStep]}</p>
          </div>
        </div>
        <span className="badge">{progress}% complete</span>
      </div>

      <div className="divider my-6" />

      <div className="score-bar">
        <div className="score-bar-fill bg-blue-700" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === currentStep;

          return (
            <div key={label} className={`panel-soft flex items-center gap-3 p-4 ${active ? "border-blue-200 bg-blue-50" : ""}`}>
              <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border ${done ? "border-blue-700 bg-blue-700 text-white" : active ? "border-blue-700 bg-white text-blue-700" : "border-slate-200 bg-white text-slate-300"}`}>
                {done ? <Check className="h-3.5 w-3.5" /> : active ? <span className="h-2 w-2 rounded-full bg-blue-700" /> : null}
              </div>
              <span className={`text-sm font-semibold ${active ? "text-shimmer" : done ? "text-slate-500" : "text-slate-400"}`}>{label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
