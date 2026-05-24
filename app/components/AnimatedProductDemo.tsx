"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, Warning, XCircle } from "@phosphor-icons/react";

const TARGET_SCORE = 74;

const categories = [
  { label: "Metadata", score: 88 },
  { label: "Schema", score: 38 },
  { label: "Content Clarity", score: 72 },
  { label: "AI Readiness", score: 55 },
];

const checks = [
  { label: "Page title optimized (54 chars)", status: "pass" as const },
  { label: "HTTPS enabled", status: "pass" as const },
  { label: "FAQPage schema missing", status: "warn" as const },
  { label: "No llms.txt file detected", status: "warn" as const },
  { label: "Schema markup not detected", status: "fail" as const },
];

export default function AnimatedProductDemo() {
  const [phase, setPhase] = useState<"idle" | "scanning" | "done">("idle");
  const [score, setScore] = useState(0);
  const [barsActive, setBarsActive] = useState(false);
  const [checksActive, setChecksActive] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hasRunRef = useRef(false);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    let showResultsTimer: ReturnType<typeof setTimeout> | null = null;
    let barsTimer: ReturnType<typeof setTimeout> | null = null;
    let checksTimer: ReturnType<typeof setTimeout> | null = null;
    let counterTimer: ReturnType<typeof setInterval> | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasRunRef.current) {
          hasRunRef.current = true;
          observer.disconnect();
          setPhase("scanning");

          showResultsTimer = setTimeout(() => {
            setPhase("done");
            let step = 0;
            const totalSteps = 36;
            const stepInterval = Math.round(1100 / totalSteps);
            counterTimer = setInterval(() => {
              step++;
              const t = step / totalSteps;
              const eased = 1 - (1 - t) * (1 - t);
              setScore(Math.round(eased * TARGET_SCORE));
              if (step >= totalSteps) {
                if (counterTimer) clearInterval(counterTimer);
                setScore(TARGET_SCORE);
                barsTimer = setTimeout(() => setBarsActive(true), 200);
                checksTimer = setTimeout(() => setChecksActive(true), 600);
              }
            }, stepInterval);
          }, 1500);
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (showResultsTimer) clearTimeout(showResultsTimer);
      if (barsTimer) clearTimeout(barsTimer);
      if (checksTimer) clearTimeout(checksTimer);
      if (counterTimer) clearInterval(counterTimer);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="product-visual">
      <div className="visual-toolbar">
        <span />
        <span />
        <span />
        <strong>AI Visibility Readiness Report</strong>
      </div>

      {phase !== "done" ? (
        <div className={`demo-scanning${phase === "scanning" ? " demo-scanning-active" : ""}`}>
          <div className="demo-scanning-ring" />
          <p className="demo-scanning-label">
            {phase === "idle" ? " " : "Analyzing your page…"}
          </p>
          <div className="demo-scan-steps">
            <span>Fetching live page content</span>
            <span>Reading metadata &amp; schema</span>
            <span>Scoring AI readiness signals</span>
          </div>
        </div>
      ) : (
        <>
          <div className="visual-score-row">
            <div className="visual-score">{score}</div>
            <div>
              <p>Overall AI visibility score</p>
              <small>Metadata strong &middot; Schema missing &middot; 3 fixes needed</small>
            </div>
          </div>
          <div className="visual-bars">
            {categories.map(({ label, score: catScore }) => (
              <div key={label}>
                <div className="visual-bar-label">
                  <span>{label}</span>
                  <span className="visual-bar-score">{catScore}/100</span>
                </div>
                <div className="visual-bar">
                  <span style={{ width: barsActive ? `${catScore}%` : "0%" }} />
                </div>
              </div>
            ))}
          </div>
          <div className={`demo-checks${checksActive ? " demo-checks-visible" : ""}`}>
            {checks.map(({ label, status }) => (
              <div key={label} className={`demo-check-item demo-check-${status}`}>
                {status === "pass" ? (
                  <CheckCircle weight="fill" className="h-4 w-4" />
                ) : status === "warn" ? (
                  <Warning weight="fill" className="h-4 w-4" />
                ) : (
                  <XCircle weight="fill" className="h-4 w-4" />
                )}
                <span>{label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
