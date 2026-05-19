"use client";

import { CheckCircle2, Radar } from "lucide-react";

const STAGE_LIST = [
  { label: "Website access", helper: "Checking if your site can be reached" },
  { label: "AI crawler access", helper: "Reviewing AI crawler and indexability signals" },
  { label: "Metadata and schema", helper: "Analyzing titles, descriptions, and structured data" },
  { label: "Answer readiness", helper: "Checking how well your content answers questions" },
  { label: "Performance and trust", helper: "Reviewing performance and trust signals" },
  { label: "Report generation", helper: "Preparing your final recommendations" },
];

const COMPARE_STAGE_LIST = [
  { label: "Your site scan", helper: "Checking your page signals" },
  { label: "Competitor scan", helper: "Checking competitor page signals" },
  { label: "AI visibility signals", helper: "Reviewing crawler access, metadata, and schema" },
  { label: "Category gaps", helper: "Finding wins, gaps, and differences" },
  { label: "Comparison report", helper: "Building your comparison report" },
];

const COMPARE_STEP_LABELS = [
  "Preparing comparison",
  "Scanning your site",
  "Scanning competitor site",
  "Comparing category signals",
  "Finding gaps and advantages",
  "Building comparison report",
];

const COMPARE_PROGRESS = [8, 24, 44, 62, 78, 88];

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
  mode?: "scan" | "report" | "compare";
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
    .replace(/^Fetching website$/i, "Checking site access")
    .replace(/^Reading metadata and schema$/i, "Analyzing metadata and schema")
    .replace(/^Running PageSpeed (analysis|check)$/i, "Checking answer readiness signals")
    .replace(/^PageSpeed unavailable, continuing$/i, "Performance check unavailable - continuing")
    .replace(/^Generating AI insights$/i, "Evaluating performance and trust signals")
    .replace(/^Using local recommendations$/i, "Preparing visibility recommendations")
    .replace(/^Scanning competitor$/i, "Scanning competitor")
    .replace(/^Preparing report$/i, "Building your report");
}

function stageIndexFromProgress(progress: LoaderProgress) {
  const label = progress.label.toLowerCase();
  const step = progress.step;
  if (step <= 1) return 0;
  if (step === 2) return 1;
  if (step === 3 || label.includes("metadata") || label.includes("schema")) return 2;
  if (step === 4 || label.includes("pagespeed") || label.includes("performance")) return 3;
  if (step === 5 || label.includes("ai insights") || label.includes("local recommendations")) return 4;
  return 5;
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

function StageDot() {
  return <span className="loading-stage-dot" />;
}

function StageList({
  stages,
  activeIndex,
  doneIndex,
  getStatus,
}: {
  stages: { label: string; helper: string }[];
  activeIndex: number;
  doneIndex: number;
  getStatus: (i: number) => string;
}) {
  return (
    <ul className="loading-stage-list">
      {stages.map((stage, i) => {
        const done = i < doneIndex;
        const active = i === activeIndex && !done;
        const status = getStatus(i);
        return (
          <li key={stage.label} className={`loading-stage-row${active ? " is-active" : ""}${done ? " is-done" : ""}`}>
            <div className="loading-stage-icon">
              {done ? <CheckCircle2 size={14} /> : <StageDot />}
            </div>
            <div className="loading-stage-copy">
              <span className="loading-stage-label">{stage.label}</span>
              <span className="loading-stage-helper">{stage.helper}</span>
            </div>
            <div className="loading-stage-status">
              <span className={`loading-stage-pill${active ? " is-active" : ""}${done ? " is-done" : ""}`}>{status}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function MobileStage({
  stage,
  stepNum,
  totalSteps,
  stages,
  activeIndex,
  doneIndex,
}: {
  stage: { label: string; helper: string };
  stepNum: number;
  totalSteps: number;
  stages: { label: string; helper: string }[];
  activeIndex: number;
  doneIndex: number;
}) {
  return (
    <div className="loading-mobile-stage" aria-hidden="true">
      <p className="loading-mobile-step-count">Step {stepNum} of {totalSteps}</p>
      <article className="loading-mobile-stage-card">
        <div className="loading-mobile-stage-head">
          <div className="loading-stage-icon">
            <StageDot />
          </div>
          <strong>{stage.label}</strong>
          <span className="loading-stage-pill is-active">In progress</span>
        </div>
        <p>{stage.helper}</p>
      </article>
      <div className="loading-mobile-dots" aria-hidden="true">
        {stages.map((s, i) => {
          const done = i < doneIndex;
          const active = i === activeIndex && !done;
          return <span key={s.label} className={`loading-mobile-dot${done ? " is-done" : ""}${active ? " is-active" : ""}`} />;
        })}
      </div>
    </div>
  );
}

export default function LoadingState({ progress, progressByStepAndStatus, step, mode = "scan" }: Props) {
  const isReportLoad = mode === "report";
  const isCompare = mode === "compare";

  if (isCompare) {
    const compareStage = Math.max(0, Math.min(COMPARE_STAGE_LIST.length - 1, step ?? 0));
    const stepIdx = Math.min(step ?? 0, COMPARE_STEP_LABELS.length - 1);
    const pct = COMPARE_PROGRESS[Math.min(step ?? 0, COMPARE_PROGRESS.length - 1)];

    return (
      <section className="surface loading-card loading-card-focused animate-fade-in-up" role="status" aria-live="polite">
        <div className="loading-header">
          <div className="loading-header-icon-col">
            <div className="loading-scan-indicator" aria-hidden="true">
              <span className="loading-scan-ring" />
              <span className="loading-scan-core"><Radar size={16} /></span>
            </div>
          </div>
          <div className="loading-header-copy-col">
            <h3 className="loading-heading">Comparing both sites</h3>
            <p className="loading-helper">Scanning your site and competitor site for AI visibility signals.</p>
          </div>
          <div className="loading-header-pill-col">
            <span className="loading-percent-badge">{pct}%</span>
          </div>
        </div>

        <div className="loading-progress">
          <div className="loading-progress-fill" style={{ width: `${pct}%` }} />
        </div>

        <div className="loading-current-step-card">
          <p className="loading-current-step-label">Current step</p>
          <p className="loading-current-step-value">{COMPARE_STEP_LABELS[stepIdx]}</p>
        </div>

        <StageList
          stages={COMPARE_STAGE_LIST}
          activeIndex={compareStage}
          doneIndex={compareStage}
          getStatus={(i) => (i < compareStage ? "Complete" : i === compareStage ? "In progress" : "Waiting")}
        />

        <MobileStage
          stage={COMPARE_STAGE_LIST[compareStage]}
          stepNum={compareStage + 1}
          totalSteps={COMPARE_STAGE_LIST.length}
          stages={COMPARE_STAGE_LIST}
          activeIndex={compareStage}
          doneIndex={compareStage}
        />
      </section>
    );
  }

  const fallbackStep = typeof step === "number" ? Math.max(1, Math.min(6, step + 1)) : 1;
  const activeProgress = progress ?? { step: fallbackStep, label: "Preparing scan", status: "started" as ProgressStatus };
  const stepNumber = Math.max(1, Math.min(6, activeProgress.step));
  const progressKey = `${stepNumber}:${activeProgress.status}`;
  const map = progressByStepAndStatus ?? DEFAULT_PROGRESS_MAP;
  const mappedProgressPercent = map[progressKey] ?? map[`${stepNumber}:started`] ?? 10;
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
      <div className="loading-header">
        <div className="loading-header-icon-col">
          <div className="loading-scan-indicator" aria-hidden="true">
            <span className="loading-scan-ring" />
            <span className="loading-scan-core"><Radar size={16} /></span>
          </div>
        </div>
        <div className="loading-header-copy-col">
          <h3 className="loading-heading">
            {isReportLoad ? "Loading your report" : "Scanning your site"}
          </h3>
          <p className="loading-helper">
            {isReportLoad
              ? "We are preparing your saved report."
              : "Checking AI visibility, crawl access, structured data, and performance signals."}
          </p>
        </div>
        <div className="loading-header-pill-col">
          <span className="loading-percent-badge">{isReportLoad ? "Report view" : `${mappedProgressPercent}%`}</span>
        </div>
      </div>

      <div className="loading-progress">
        <div className="loading-progress-fill" style={{ width: `${isReportLoad ? 62 : mappedProgressPercent}%` }} />
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
          <StageList
            stages={STAGE_LIST}
            activeIndex={activeStageIndex}
            doneIndex={doneStageIndex}
            getStatus={(i) => stageStatusLabel(i, activeStageIndex, doneStageIndex)}
          />

          <MobileStage
            stage={mobileStage}
            stepNum={Math.max(1, activeStageIndex + 1)}
            totalSteps={STAGE_LIST.length}
            stages={STAGE_LIST}
            activeIndex={activeStageIndex}
            doneIndex={doneStageIndex}
          />
        </>
      )}
    </section>
  );
}
