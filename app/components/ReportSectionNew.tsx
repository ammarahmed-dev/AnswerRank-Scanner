"use client";

import { ScanResult, CheckResult } from "@/types/index";
import ScoreCircle from "./ScoreCircle";
import {
  CheckCircle2,
  Copy,
  Crown,
  ExternalLink,
  AlertCircle,
  Info,
  Lightbulb,
  Lock,
  RotateCcw,
  Zap,
} from "lucide-react";
import { ReactNode, useState } from "react";

interface Props {
  report: ScanResult;
  onReset: () => void;
}

const statusColors = {
  pass: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warn: "bg-amber-50 text-amber-800 border-amber-200",
  fail: "bg-red-50 text-red-800 border-red-200",
};

const statusIcons = {
  pass: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  warn: <AlertCircle className="h-4 w-4 text-amber-600" />,
  fail: <AlertCircle className="h-4 w-4 text-red-600" />,
};

export default function ReportSectionNew({ report, onReset }: Props) {
  const { url, score, checks, aiInsights, pagespeed, scannedAt } = report;
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);

  const passChecks = checks.filter((c) => c.status === "pass");
  const warnChecks = checks.filter((c) => c.status === "warn");
  const failChecks = checks.filter((c) => c.status === "fail");

  const getScoreColor = () => {
    if (score >= 70) return "text-emerald-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

  const handleCopy = async () => {
    const lines = [
      `AnswerRank Report for ${url}`,
      `Score: ${score}/100`,
      `Scanned: ${new Date(scannedAt).toLocaleString()}`,
      "",
      "Passed Checks:",
      ...passChecks.map((c) => `✓ ${c.label}: ${c.detail}`),
      "",
      "Warnings:",
      ...warnChecks.map((c) => `⚠ ${c.label}: ${c.detail}`),
      "",
      "Failed Checks:",
      ...failChecks.map((c) => `✗ ${c.label}: ${c.detail}`),
    ];

    if (aiInsights) {
      lines.push("", "AI Insights:", aiInsights.summary, "", "Quick Win:", aiInsights.quickWin, "", "Recommendations:");
      aiInsights.recommendations.forEach((rec, i) => {
        lines.push(`${i + 1}. ${rec}`);
      });
    }

    const text = lines.join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice("Clipboard access was blocked.");
      setTimeout(() => setNotice(""), 3000);
    }
  };

  return (
    <div className="report-shell report-stack pb-8">
      <section className="surface report-hero">
        <div className="report-hero-grid">
          <div className="flex items-center justify-center">
            <div className={`text-6xl font-extrabold ${getScoreColor()}`}>{score}</div>
          </div>
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <span className="eyebrow">AI Visibility Scan</span>
              {aiInsights && <span className="badge">AI Analysis</span>}
              {pagespeed && <span className="badge">PageSpeed {pagespeed.score}/100</span>}
              <span className="badge text-xs">{new Date(scannedAt).toLocaleDateString()}</span>
            </div>
            <h2 className="report-title break-words">{url}</h2>
            <a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:text-blue-900">
              Open page <ExternalLink className="h-3.5 w-3.5" />
            </a>
            {aiInsights && (
              <div className="verdict-box mt-4">
                <p className="text-sm font-bold text-slate-600 mb-2">AI Insights</p>
                <p className="body-copy">{aiInsights.summary}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="report-grid">
        <main className="report-main">
          {aiInsights && (
            <section className="surface report-card bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
              <SectionHeader
                icon={<Zap className="h-4 w-4 text-blue-600" />}
                title="Quick Win"
                text="Highest-impact fix you can implement today"
              />
              <div className="mt-4 p-3 bg-white rounded border border-blue-200">
                <p className="font-semibold text-blue-900">{aiInsights.quickWin}</p>
              </div>
            </section>
          )}

          <section className="surface report-card">
            <SectionHeader
              icon={<Info className="h-4 w-4" />}
              title={`Audit Results: ${passChecks.length} Pass, ${warnChecks.length} Warning, ${failChecks.length} Issues`}
              text="Deterministic SEO and AEO checks"
            />
            <div className="mt-5 space-y-2">
              {checks.map((check) => (
                <div
                  key={check.id}
                  className={`border rounded p-3 cursor-pointer transition ${statusColors[check.status]}`}
                  onClick={() => setExpandedCheck(expandedCheck === check.id ? null : check.id)}
                >
                  <div className="flex items-center gap-2">
                    {statusIcons[check.status]}
                    <div className="flex-1">
                      <p className="font-semibold">{check.label}</p>
                    </div>
                    <span className="text-xs font-bold">Weight: {check.weight}</span>
                  </div>
                  {expandedCheck === check.id && (
                    <p className="mt-2 text-sm pl-6">{check.detail}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {aiInsights && aiInsights.recommendations.length > 0 && (
            <section className="surface report-card">
              <SectionHeader
                icon={<Lightbulb className="h-4 w-4" />}
                title="Recommendations"
                text="AI-powered suggestions for improvement"
              />
              <ul className="mt-5 space-y-3">
                {aiInsights.recommendations.map((rec, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-1 flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </span>
                    <p className="body-copy flex-1">{rec}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {aiInsights && aiInsights.contentGap && (
            <section className="surface report-card border-l-4 border-l-amber-500">
              <SectionHeader
                icon={<AlertCircle className="h-4 w-4 text-amber-600" />}
                title="Content Gap"
                text="Based on heading analysis"
              />
              <p className="mt-3 body-copy">{aiInsights.contentGap}</p>
            </section>
          )}
        </main>

        <aside className="report-sidebar">
          {!aiInsights && (
            <section className="surface report-card bg-blue-50 border border-blue-200">
              <p className="text-sm font-bold text-blue-900 mb-2">AI Unavailable</p>
              <p className="text-sm text-blue-800">
                AI analysis is unavailable. Showing deterministic report only.
              </p>
            </section>
          )}

          {pagespeed && (
            <section className="surface report-card">
              <p className="section-kicker font-bold uppercase tracking-[0.12em]">PageSpeed</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-950">{pagespeed.score}/100</p>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                {pagespeed.lcp && <p>LCP: {pagespeed.lcp}ms</p>}
                {pagespeed.cls && <p>CLS: {pagespeed.cls}</p>}
                {pagespeed.fid && <p>FID: {pagespeed.fid}ms</p>}
              </div>
            </section>
          )}

          <section className="surface report-card">
            <h3 className="section-heading">Summary</h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Passed</span>
                <span className="font-bold text-emerald-600">{passChecks.length}/{checks.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Warnings</span>
                <span className="font-bold text-amber-600">{warnChecks.length}/{checks.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Issues</span>
                <span className="font-bold text-red-600">{failChecks.length}/{checks.length}</span>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <section className="surface pro-card">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex-1">
            <SectionHeader
              icon={<Crown className="h-4 w-4" />}
              title="Pro Report locked"
              text="A clear paid upgrade path for the next Stripe step."
            />
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "Full AI breakdown",
                "Competitor analysis",
                "Complete schema recommendations",
                "FAQ generation",
                "PDF export",
                "Priority checklist",
              ].map((item) => (
                <div key={item} className="panel flex items-center gap-2 px-3 py-3 text-sm font-semibold text-slate-700">
                  <Lock className="h-3.5 w-3.5 flex-shrink-0 text-blue-700" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="lg:w-64">
            <button onClick={() => setNotice("Stripe checkout will be connected in the next step.")} className="btn btn-primary">
              Unlock Full Report - $9
            </button>
            <p className="muted-copy mt-3 text-center">One-time report purchase. No subscription yet.</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <button onClick={handleCopy} className="btn btn-secondary">
          {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy report"}
        </button>
        <button onClick={onReset} className="btn btn-primary">
          <RotateCcw className="h-4 w-4" />
          Scan another URL
        </button>
      </div>

      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}

function SectionHeader({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="icon-tile">{icon}</div>
      <div>
        <h3 className="section-heading">{title}</h3>
        <p className="section-kicker mt-1">{text}</p>
      </div>
    </div>
  );
}
