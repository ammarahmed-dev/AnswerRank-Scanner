"use client";

interface Props {
  label: string;
  score: number;
  max: number;
}

export default function CategoryCard({ label, score, max }: Props) {
  const pct = Math.round((score / max) * 100);
  const tone = pct >= 80 ? "bg-emerald-400" : pct >= 50 ? "bg-cyan-400" : "bg-amber-400";
  const textTone = pct >= 80 ? "text-emerald-300" : pct >= 50 ? "text-cyan-300" : "text-amber-300";

  return (
    <div className="panel-soft p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-100">{label}</span>
        <span className={`text-sm font-extrabold tabular-nums ${textTone}`}>
          {score}<span className="font-semibold text-slate-500">/{max}</span>
        </span>
      </div>
      <div className="score-bar">
        <div className={`score-bar-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

