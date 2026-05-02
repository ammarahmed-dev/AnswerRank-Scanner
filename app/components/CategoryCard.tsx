"use client";

interface Props {
  label: string;
  score: number;
  max: number;
}

export default function CategoryCard({ label, score, max }: Props) {
  const pct = Math.round((score / max) * 100);
  const tone = pct >= 80 ? "bg-emerald-600" : pct >= 50 ? "bg-blue-700" : "bg-amber-500";
  const textTone = pct >= 80 ? "text-emerald-700" : pct >= 50 ? "text-blue-700" : "text-amber-700";

  return (
    <div className="panel-soft p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-900">{label}</span>
        <span className={`text-sm font-extrabold tabular-nums ${textTone}`}>
          {score}<span className="font-semibold text-slate-400">/{max}</span>
        </span>
      </div>
      <div className="score-bar">
        <div className={`score-bar-fill ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
