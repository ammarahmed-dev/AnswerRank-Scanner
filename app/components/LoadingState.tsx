"use client";

import { Check, Loader2 } from "lucide-react";

const STEPS = [
  "Initializing deep crawl sequence",
  "Extracting semantic metadata",
  "Validating structured schema",
  "Processing entity relationships",
  "Generating AI synthesis report",
];

interface Props {
  step: number;
}

export default function LoadingState({ step }: Props) {
  return (
    <div className="glass-card p-8 sm:p-10 flex flex-col gap-8 max-w-md mx-auto animate-fade-in relative overflow-hidden">
      
      {/* Background glow for loading card */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex items-center gap-4 border-b border-white/5 pb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)]">
          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-lg tracking-tight">Analyzing Website</h3>
          <p className="text-xs text-slate-400 mt-0.5">Please wait ~15 seconds</p>
        </div>
      </div>

      <div className="w-full flex flex-col gap-5">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={i} className="flex items-center gap-4">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                  done
                    ? "bg-gradient-to-br from-indigo-400 to-purple-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]"
                    : active
                    ? "border border-indigo-400/50 bg-indigo-500/10"
                    : "border border-white/5 bg-black/20"
                }`}
              >
                {done && <Check className="w-3 h-3 text-white" />}
                {active && <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />}
              </div>
              <span
                className={`text-sm font-medium transition-all duration-500 ${
                  done
                    ? "text-slate-500"
                    : active
                    ? "text-white text-shimmer"
                    : "text-slate-600"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
