"use client";

interface Props {
  score: number;
}

export default function ScoreCircle({ score }: Props) {
  let grade = "Poor";
  let gradeColor = "text-red-400";
  let gradientId = "gradPoor";
  
  if (score >= 85) {
    grade = "Excellent";
    gradeColor = "text-cyan-400";
    gradientId = "gradExcel";
  } else if (score >= 70) {
    grade = "Strong";
    gradeColor = "text-indigo-400";
    gradientId = "gradStrong";
  } else if (score >= 50) {
    grade = "Needs Work";
    gradeColor = "text-purple-400";
    gradientId = "gradMed";
  }

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
        
        {/* Ambient glow behind circle */}
        <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-2xl"></div>

        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          className="absolute inset-0 drop-shadow-2xl"
        >
          <defs>
            <linearGradient id="gradExcel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="gradStrong" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <linearGradient id="gradMed" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
            <linearGradient id="gradPoor" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Track */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
          />
          {/* Progress */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 90 90)"
            style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.2, 0.8, 0.2, 1)" }}
          />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold tabular-nums tracking-tighter text-white drop-shadow-md">
            {score}
          </span>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">
            Out of 100
          </span>
        </div>
      </div>

      <div className="glass-card px-5 py-2 rounded-full border border-white/10 flex items-center gap-2">
        <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">Grade</span>
        <div className="w-1 h-4 bg-white/10 mx-1"></div>
        <span className={`text-sm font-bold ${gradeColor}`}>
          {grade}
        </span>
      </div>
    </div>
  );
}
