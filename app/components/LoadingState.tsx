"use client";

import { CheckCircle2, Radar } from "lucide-react";

const STAGE_LIST = [
  { label: "Website access", helper: "Checking if your site can be reached" },
  { label: "AI visibility", helper: "Reviewing AI crawler access signals" },
  { label: "SEO foundations", helper: "Checking robots, sitemap, and metadata" },
  { label: "Performance signals", helper: "Measuring speed and Core Web Vitals" },
  { label: "Report generation", helper: "Preparing your final recommendations" },
];

type ProgressStatus = "started" | "complete" | "skipped" | "error";
type LoaderProgress = {
  step: number;
  label: string;
  status: ProgressStatus;
};

interface Props {
  progress?: LoaderProgress;
  progressByStepAndStatus?: Record<string, number>;
  step?: number;
  mode?: "scan" | "report";
}

const DEFAULT_PROGRESS_MAP: Record<string, number> = {
  "1:started": 10,
  "1:complete": 18,
  "2:started": 25,
  "2:complete": 33,
  "3:started": 40,
  "3:complete": 50,
  "4:started": 58,
  "4:complete": 66,
  "4:skipped": 66,
  "4:error": 66,
  "5:started": 75,
  "5:complete": 84,
  "5:skipped": 84,
  "5:error": 84,
  "6:started": 92,
  "6:complete": 100,
};

function getDisplayLabel(label: string) {
  return label
    .replace(/^Preparing scan$/i, "Preparing scan")
    .replace(/^Fetching website$/i, "Fetching website content")
    .replace(/^Reading metadata and schema$/i, "Analyzing structured data")
    .replace(/^Running PageSpeed (analysis|check)$/i, "Measuring performance signals")
    .replace(/^PageSpeed unavailable, continuing$/i, "Performance signals unavailable - continuing")
    .replace(/^Generating AI insights$/i, "Reviewing AI visibility signals")
    .replace(/^Using local recommendations$/i, "Using local visibility recommendations")
    .replace(/^Scanning competitor$/i, "Scanning competitor")
    .replace(/^Preparing report$/i, "Building your report");
}

function stageIndexFromProgress(progress: LoaderProgress) {
  const label = progress.label.toLowerCase();
  if (label.includes("prepare")) return 0;
  if (label.includes("fetch")) return 0;
  if (label.includes("metadata") || label.includes("schema")) return 2;
  if (label.includes("pagespeed") || label.includes("performance")) return 3;
  if (label.includes("ai insights") || label.includes("local recommendations")) return 1;
  if (label.includes("competitor") || label.includes("report")) return 4;
  return Math.max(0, Math.min(4, progress.step - 1));
}

function doneStageIndexFromProgress(progress: LoaderProgress) {
  const index = stageIndexFromProgress(progress);
  return progress.status === "complete" ? index + 1 : index;
}

function stageStatusLabel(index: number, activeIndex: number, doneIndex: number) {
  if (index < doneIndex) return "Complete";
  if (index === activeIndex) return "In progress";
  return "Waiting";
}

export default function LoadingState({ progress, progressByStepAndStatus, step, mode = "scan" }: Props) {
  const isReportLoad = mode === "report";
  const fallbackStep = typeof step === "number" ? Math.max(1, Math.min(6, step + 1)) : 1;
  const activeProgress = progress ?? { step: fallbackStep, label: "Preparing scan", status: "started" as ProgressStatus };
  const stepNumber = Math.max(1, Math.min(6, activeProgress.step));
  const progressKey = `${stepNumber}:${activeProgress.status}`;
  const map = progressByStepAndStatus ?? DEFAULT_PROGRESS_MAP;
  const mappedProgressPercent = map[progressKey] ?? map[`${stepNumber}:started`] ?? 10;
  const progressPercent = mappedProgressPercent;
  const statusText = activeProgress.status === "error"
    ? "Step unavailable - continuing"
    : activeProgress.status === "skipped"
      ? "Step skipped - continuing"
      : getDisplayLabel(activeProgress.label);
  const activeStageIndex = stageIndexFromProgress(activeProgress);
  const doneStageIndex = doneStageIndexFromProgress(activeProgress);
  const mobileStage = STAGE_LIST[Math.max(0, Math.min(STAGE_LIST.length - 1, activeStageIndex))];

  return (
    <section className="surface loading-card loading-card-focused animate-fade-in-up" role="status" aria-live="polite">
      <div className="loading-card-header loading-header-grid">
        <div className="loading-header-icon-col">
          <div className="loading-scan-indicator" aria-hidden="true">
            <span className="loading-scan-ring" />
            <span className="loading-scan-core">
              <Radar className="h-4 w-4" />
            </span>
          </div>
        </div>
        <div className="loading-header-copy-col loading-copy-block">
          <h3 className="section-heading loading-heading">
            {isReportLoad ? "Loading your report" : "Scanning your site"}
          </h3>
          <p className="section-kicker loading-helper">
            {isReportLoad
              ? "We are preparing your saved report."
              : "Checking AI visibility, crawl access, structured data, and performance signals."}
          </p>
        </div>
        <div className="loading-header-pill-col">
          <span className="badge loading-percent-badge">{isReportLoad ? "Report view" : `${progressPercent}%`}</span>
        </div>
      </div>

      <div className="loading-progress">
        <div className="score-bar-fill loading-progress-fill" style={{ width: `${isReportLoad ? 62 : mappedProgressPercent}%` }} />
      </div>

      <div className="loading-current-step-card">
        <p className="loading-current-step-label">Current step</p>
        <p className="loading-current-step-value">{statusText}</p>
      </div>

      {isReportLoad ? (
        <div className="saved-report-loading">
          <span>Loading score, checks, recommendations, and report details.</span>
        </div>
      ) : (
        <>
          <ul className="loading-stage-list">
            {STAGE_LIST.map((stage, i) => {
              const done = i < doneStageIndex;
              const active = i === activeStageIndex && !done;
              const status = stageStatusLabel(i, activeStageIndex, doneStageIndex);
              return (
                <li key={stage.label} className={`loading-stage-item${active ? " is-active" : ""}${done ? " is-done" : ""}`}>
                  <div className="loading-stage-main">
                    <span className="loading-stage-icon-wrap">
                      <span className="loading-stage-icon">
                        {done ? <CheckCircle2 className="h-4 w-4" /> : <span className="loading-stage-dot" />}
                      </span>
                    </span>
                    <span className="loading-stage-copy">
                      <span className="loading-stage-label">{stage.label}</span>
                      <span className="loading-stage-helper">{stage.helper}</span>
                    </span>
                  </div>
                  <span className="loading-stage-status-badge">{status}</span>
                </li>
              );
            })}
          </ul>

          <div className="loading-mobile-stage" aria-hidden="true">
            <p className="loading-mobile-step-count">Step {Math.max(1, activeStageIndex + 1)} of {STAGE_LIST.length}</p>
            <article className="loading-mobile-stage-card">
              <div className="loading-mobile-stage-head">
                <span className="loading-stage-icon-wrap">
                  <span className="loading-stage-icon">
                    <span className="loading-stage-dot" />
                  </span>
                </span>
                <strong>{mobileStage.label}</strong>
                <span className="loading-stage-status-badge">In progress</span>
              </div>
              <p>{mobileStage.helper}</p>
            </article>
            <div className="loading-mobile-dots" aria-hidden="true">
              {STAGE_LIST.map((stage, i) => {
                const done = i < doneStageIndex;
                const active = i === activeStageIndex && !done;
                return <span key={stage.label} className={`loading-mobile-dot${done ? " is-done" : ""}${active ? " is-active" : ""}`} />;
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

