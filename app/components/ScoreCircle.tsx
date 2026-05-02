"use client";

interface Props {
  score: number;
}

export default function ScoreCircle({ score }: Props) {
  let grade = "Poor";
  let gradeClass = "text-red-700";
  let gradientId = "scorePoor";

  if (score >= 85) {
    grade = "Excellent";
    gradeClass = "text-emerald-700";
    gradientId = "scoreExcellent";
  } else if (score >= 70) {
    grade = "Strong";
    gradeClass = "text-blue-700";
    gradientId = "scoreStrong";
  } else if (score >= 50) {
    grade = "Needs Work";
    gradeClass = "text-amber-700";
    gradientId = "scoreMedium";
  }

  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex w-[190px] flex-shrink-0 flex-col items-center gap-4">
      <div className="relative flex h-[180px] w-[180px] items-center justify-center">
        <svg width="180" height="180" viewBox="0 0 180 180" className="absolute inset-0">
          <defs>
            <linearGradient id="scoreExcellent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#0f9f8f" />
            </linearGradient>
            <linearGradient id="scoreStrong" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2457d6" />
              <stop offset="100%" stopColor="#173ea5" />
            </linearGradient>
            <linearGradient id="scoreMedium" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#b7791f" />
            </linearGradient>
            <linearGradient id="scorePoor" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#c24141" />
            </linearGradient>
          </defs>
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 90 90)"
            style={{ transition: "stroke-dashoffset 900ms ease" }}
          />
        </svg>
        <div className="panel flex h-[128px] w-[128px] flex-col items-center justify-center rounded-full">
          <span className="text-5xl font-extrabold tracking-tight text-slate-950 tabular-nums">{score}</span>
          <span className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-400">Out of 100</span>
        </div>
      </div>

      <div className="badge">
        Grade <span className={`font-extrabold ${gradeClass}`}>{grade}</span>
      </div>
    </div>
  );
}
