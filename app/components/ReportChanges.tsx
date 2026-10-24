import type { CSSProperties } from "react";
import type { PreviousScanSummary, ScanResult } from "@/types/index";
import { diffReports } from "@/lib/report-diff";

export default function ReportChanges({ report, previous }: { report: ScanResult; previous: PreviousScanSummary }) {
  const diff = diffReports(report.score, report.checks, previous, report.methodology?.version);
  const when = new Date(diff.previousScannedAt);
  const dateLabel = Number.isNaN(when.getTime()) ? "" : ` on ${when.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  if (diff.scoreDelta === null) {
    return (
      <section className="surface report-card print-section" aria-label="Changes since your last scan">
        <h3 className="section-heading">Since Your Last Scan</h3>
        <p className="section-kicker mt-1">Your earlier scan of this URL{dateLabel} scored {diff.previousScore} out of 100.</p>
        <p>{diff.comparison === "method_changed"
          ? "These scans used different scoring methods. Score and check changes cannot be interpreted as improvements or regressions."
          : "A scoring method was not recorded for one or both scans. Score and check changes cannot be compared reliably."}</p>
        <p>Use this scan as your new baseline, then retest with the same scoring method to compare changes.</p>
      </section>
    );
  }
  const compared = diff.improved.length + diff.regressed.length + diff.unchanged;
  const share = (n: number) => (compared ? Math.round((n / compared) * 100) : 0);
  const scoreColor = report.score >= 90 ? "#00d68f" : report.score >= 70 ? "#00f0b4" : report.score >= 50 ? "#ffb830" : "#ff4d6a";
  const verdict = diff.scoreDelta > 0 ? "Improving" : diff.scoreDelta < 0 ? "Slipping" : "No change";
  const pills = (items: typeof diff.improved, tone: "up" | "down") => (
    <span className="report-diff-pills">
      {items.slice(0, 6).map((c) => (
        <span key={c.id} className={`mini-pill report-diff-pill-${tone}`}>{c.label}</span>
      ))}
      {items.length > 6 && <span className="mini-pill badge-low">+{items.length - 6} more</span>}
    </span>
  );
  return (
    <section className="surface report-card print-section" aria-label="Changes since your last scan">
      <h3 className="section-heading">Since Your Last Scan</h3>
      <p className="section-kicker mt-1">Compared with your scan of this URL{dateLabel}.</p>
      <div className="score-breakdown-grid mt-4">
        <div className="score-breakdown-card">
          <div className="score-breakdown-head">
            <span>Score Change</span>
            <strong>{diff.scoreDelta > 0 ? "+" : ""}{diff.scoreDelta}</strong>
          </div>
          <div className="score-bar"><span className="score-bar-fill" style={{ width: `${report.score}%`, "--bar-color": scoreColor } as CSSProperties} /></div>
          <small>{verdict}</small>
          <p>{diff.previousScore} &rarr; {report.score} out of 100.</p>
        </div>
        <div className="score-breakdown-card">
          <div className="score-breakdown-head">
            <span>Checks Improved</span>
            <strong>{diff.improved.length}</strong>
          </div>
          <div className="score-bar"><span className="score-bar-fill" style={{ width: `${share(diff.improved.length)}%`, "--bar-color": "#00f0b4" } as CSSProperties} /></div>
          <small>{diff.improved.length ? "Fixes are working" : "Nothing improved yet"}</small>
          {diff.improved.length > 0 ? pills(diff.improved, "up") : <p>Apply the fixes below, then retest.</p>}
        </div>
        <div className="score-breakdown-card">
          <div className="score-breakdown-head">
            <span>Checks Worse</span>
            <strong>{diff.regressed.length}</strong>
          </div>
          <div className="score-bar"><span className="score-bar-fill" style={{ width: `${share(diff.regressed.length)}%`, "--bar-color": "#ff4d6a" } as CSSProperties} /></div>
          <small>{diff.regressed.length ? "Needs attention" : "No regressions"}</small>
          {diff.regressed.length > 0 ? pills(diff.regressed, "down") : <p>Nothing dropped since your last scan.</p>}
        </div>
        <div className="score-breakdown-card">
          <div className="score-breakdown-head">
            <span>Unchanged</span>
            <strong>{diff.unchanged}</strong>
          </div>
          <div className="score-bar"><span className="score-bar-fill" style={{ width: `${share(diff.unchanged)}%`, "--bar-color": "#94a3b8" } as CSSProperties} /></div>
          <small>Same status</small>
          <p>{diff.added > 0 ? `${diff.added} new check${diff.added === 1 ? "" : "s"} added since your last scan.` : "Checks that kept the same result."}</p>
        </div>
      </div>
    </section>
  );
}
