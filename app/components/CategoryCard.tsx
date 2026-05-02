"use client";

interface Props {
  label: string;
  score: number;
  max: number;
}

export default function CategoryCard({ label, score, max }: Props) {
  const pct = Math.round((score / max) * 100);
  
  const isHigh = pct >= 80;
  const isMed = pct >= 50 && pct < 80;
  
  const textColor = isHigh ? "text-cyan-400" : isMed ? "text-indigo-400" : "text-purple-400";
  const bgGradient = isHigh 
    ? "linear-gradient(90deg, #06b6d4, #3b82f6)" 
    : isMed 
    ? "linear-gradient(90deg, #6366f1, #a855f7)" 
    : "linear-gradient(90deg, #a855f7, #f43f5e)";

  return (
    <div className="glass-card p-5 flex flex-col gap-4 group">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
          {label}
        </span>
        <span className={`text-base font-bold tabular-nums ${textColor} drop-shadow-sm`}>
          {score} <span className="text-slate-600 text-xs font-medium">/ {max}</span>
        </span>
      </div>
      <div className="score-bar">
        <div
          className="score-bar-fill relative"
          style={{ width: `${pct}%`, background: bgGradient }}
        >
          {/* Subtle light reflection on the bar */}
          <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-t-full"></div>
        </div>
      </div>
    </div>
  );
}
