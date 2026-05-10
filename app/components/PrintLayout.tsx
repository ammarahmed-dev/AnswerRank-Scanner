import { useEffect, useState } from "react";
import { ScanResult } from "@/types/index";

interface Props {
  report: ScanResult;
}

type Category = "schema" | "metadata" | "content" | "performance" | "trust" | "ai-readiness" | "headings";

const CATEGORY_LABELS: Record<Category, string> = {
  schema: "Schema",
  metadata: "Metadata",
  content: "Content Clarity",
  performance: "Performance",
  trust: "Trust Signals",
  "ai-readiness": "AI Readiness",
  headings: "Headings",
};

function grade(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Needs Work";
  return "Poor";
}

function gradeColor(score: number) {
  if (score >= 85) return "pl-grade-excellent";
  if (score >= 70) return "pl-grade-strong";
  if (score >= 50) return "pl-grade-medium";
  return "pl-grade-poor";
}

function mapCategory(id: string): Category {
  if (id.includes("schema")) return "schema";
  if (id.includes("title") || id.includes("meta") || id.includes("og") || id.includes("canonical")) return "metadata";
  if (id.includes("h1") || id.includes("heading")) return "headings";
  if (id.includes("faq") || id.includes("word") || id.includes("body") || id.includes("alt") || id.includes("link")) return "content";
  if (id.includes("speed") || id.includes("perf")) return "performance";
  if (id.includes("trust") || id.includes("https") || id.includes("robot")) return "trust";
  return "ai-readiness";
}

function statusColor(status: string) {
  if (status === "fail") return "pl-badge-critical";
  if (status === "warn") return "pl-badge-high";
  return "";
}

function categoryScores(checks: ScanResult["checks"]) {
  const groups: Record<Category, number[]> = {
    schema: [], metadata: [], content: [], performance: [],
    trust: [], "ai-readiness": [], headings: [],
  };
  checks.forEach((c) => {
    const cat = mapCategory(c.id);
    const val = c.status === "pass" ? 100 : c.status === "warn" ? 60 : 25;
    groups[cat].push(val);
  });
  return (Object.entries(groups) as [Category, number[]][])
    .filter(([, vals]) => vals.length > 0)
    .map(([cat, vals]) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      score: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    }));
}

export default function PrintLayout({ report }: Props) {
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const onBefore = () => setIsPrinting(true);
    const onAfter = () => setIsPrinting(false);
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);
    return () => {
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint", onAfter);
    };
  }, []);

  if (!isPrinting) return <div className="print-layout" />;

  const date = new Date(report.scannedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const scores = categoryScores(report.checks);
  const issues = report.checks.filter((c) => c.status !== "pass");

  return (
    <div className="print-layout">
      {/* Header */}
      <div className="pl-header">
        <div className="pl-brand">AnswerRank Scanner · AI Visibility Report</div>
        <div className="pl-meta">
          <span className="pl-url">{report.url}</span>
          <span className="pl-date">Scanned {date}</span>
        </div>
        <div className="pl-score-row">
          <span className="pl-score-number">{report.score}</span>
          <span className="pl-score-label">out of 100</span>
          <span className={`pl-grade ${gradeColor(report.score)}`}>{grade(report.score)}</span>
        </div>
        <hr className="pl-divider" />
      </div>

      {/* Score Breakdown */}
      <div className="pl-section">
        <h2 className="pl-section-title">Score Breakdown</h2>
        <table className="pl-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((row) => (
              <tr key={row.category}>
                <td>{row.label}</td>
                <td>{row.score}/100</td>
                <td>{grade(row.score)}</td>
              </tr>
            ))}
            {report.pagespeed?.score !== undefined && (
              <tr>
                <td>Page Speed</td>
                <td>{report.pagespeed.score}/100</td>
                <td>{grade(report.pagespeed.score)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Priority Issues */}
      {issues.length > 0 && (
        <div className="pl-section">
          <h2 className="pl-section-title">Priority Issues</h2>
          <table className="pl-table">
            <thead>
              <tr>
                <th>Issue</th>
                <th>Category</th>
                <th>Status</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((c) => (
                <tr key={c.id}>
                  <td>{c.label}</td>
                  <td>{CATEGORY_LABELS[mapCategory(c.id)]}</td>
                  <td><span className={statusColor(c.status)}>{c.status === "fail" ? "Fail" : "Warning"}</span></td>
                  <td>{c.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* AI Insights */}
      {report.aiInsights && (
        <div className="pl-section">
          <h2 className="pl-section-title">AI Recommendations</h2>
          <p className="pl-body">{report.aiInsights.summary}</p>
          <p className="pl-label">Quick Win</p>
          <p className="pl-body">{report.aiInsights.quickWin}</p>
          {report.aiInsights.recommendations.length > 0 && (
            <>
              <p className="pl-label">Recommendations</p>
              <ol className="pl-list">
                {report.aiInsights.recommendations.map((rec, i) => (
                  <li key={i} className="pl-body">{rec}</li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="pl-footer">
        AnswerRank Scanner · answerrank.com · AI Visibility Report · Generated {date}
      </div>
    </div>
  );
}
