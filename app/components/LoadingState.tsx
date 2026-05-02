"use client";

import { Check, Loader2 } from "lucide-react";

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
  const progress = Math.min(100, Math.round((step / STEPS.length) * 100));

  return (
    <div className="glass-card p-8 sm:p-10 flex flex-col gap-8 max-w-2xl mx-auto animate-fade-in relative overflow-hidden">
      <div className="absolute -top-20 -right-10 w-52 h-52 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            <Loader2 className="w-5 h-5 text-indigo-300 animate-spin" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg tracking-tight">Running AI Visibility Scan</h3>
            <p className="text-xs text-slate-400 mt-0.5">Typically 10–20 seconds depending on the site</p>
          </div>
        </div>
        <span className="text-xs px-3 py-1 rounded-full border border-white/10 bg-white/5 text-slate-300">{progress}%</span>
      </div>

      <div className="score-bar h-2">
        <div className="score-bar-fill" style={{ width: `${progress}%`, background: "linear-gradient(90deg, #06b6d4, #6366f1, #a855f7)" }} />
      </div>

      <div className="w-full flex flex-col gap-4">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={label} className="flex items-center gap-4">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                  done
                    ? "bg-gradient-to-br from-cyan-400 to-indigo-500"
                    : active
                    ? "border border-indigo-400/60 bg-indigo-500/20"
                    : "border border-white/10 bg-black/20"
                }`}
              >
                {done && <Check className="w-3 h-3 text-white" />}
                {active && <div className="w-2 h-2 bg-indigo-300 rounded-full animate-pulse" />}
              </div>
              <span className={`text-sm transition-all duration-500 ${done ? "text-slate-500" : active ? "text-white text-shimmer" : "text-slate-600"}`}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
