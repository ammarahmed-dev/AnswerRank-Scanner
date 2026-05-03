"use client";

import type { CSSProperties } from "react";

interface Props {
  score: number;
}

export default function ScoreCircle({ score }: Props) {
  let grade = "Poor";
  let gradeClass = "text-red-300";
  let ringClass = "score-ring-poor";

  if (score >= 85) {
    grade = "Excellent";
    gradeClass = "text-emerald-300";
    ringClass = "score-ring-excellent";
  } else if (score >= 70) {
    grade = "Strong";
    gradeClass = "text-cyan-300";
    ringClass = "score-ring-strong";
  } else if (score >= 50) {
    grade = "Needs Work";
    gradeClass = "text-amber-300";
    ringClass = "score-ring-medium";
  }

  return (
    <div className="score-widget">
      <div className={`score-ring ${ringClass}`} style={{ "--score": `${score}%` } as CSSProperties}>
        <div className="score-core">
          <span>{score}</span>
          <small>Out of 100</small>
        </div>
      </div>

      <div className="score-grade-badge">
        Grade <span className={`font-extrabold ${gradeClass}`}>{grade}</span>
      </div>
    </div>
  );
}
