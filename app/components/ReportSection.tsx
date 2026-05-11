"use client";

import { AnalysisReport } from "@/types/report";
import ScoreCircle from "./ScoreCircle";
import CategoryCard from "./CategoryCard";
import {
  CheckCircle2,
  Copy,
  Crown,
  ExternalLink,
  FileText,
  Layers3,
  Lightbulb,
  Lock,
  MessageSquareText,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { ReactNode, useState } from "react";

interface Props {
  report: AnalysisReport;
  onReset: () => void;
}

export default function ReportSection({ report, onReset }: Props) {
  const { extractedData: d, scores, aiAnalysis: ai, pageSpeedScore } = report;
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);

  const topFixes = ai.highImpactFixes.slice(0, 3);
  const schemaFound = Array.from(new Set(d.schemaTypes)).slice(0, 8);
  const metadataRows = [
    ["Title", d.pageTitle || "Not found"],
    ["Meta description", d.metaDescription || "Not found"],
    ["Canonical", d.canonicalUrl || "Not found"],
    ["Primary H1", d.h1Tags[0] || "Not found"],
    ["Open Graph title", d.ogTitle || "Not found"],
    ["Images missing alt", `${d.imagesMissingAlt} of ${d.imageCount}`],
  ];

  const handleCopy = async () => {
    const text = [
      `AnswerRank report for ${report.url}`,
      `Overall score: ${scores.total}/100`,
      "",
      "Top fixes:",
      ...topFixes.map((fix, i) => `${i + 1}. ${fix}`),
      "",
      "Recommended FAQs:",
      ...ai.recommendedFaqs.slice(0, 3).map((faq, i) => `${i + 1}. ${faq.question} - ${faq.answer}`),
      "",
      `Final verdict: ${ai.finalVerdict}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice("Clipboard access was blocked. You can still select and copy the recommendations manually.");
      setTimeout(() => setNotice(""), 3000);
    }
  };

  const showUpgrade = () => {
    setNotice("Use the Pro upgrade button to open Stripe Checkout.");
    setTimeout(() => setNotice(""), 2800);
  };

  return (
    <div className="report-shell report-stack pb-8">
      <section className="surface report-hero">
        <div className="report-hero-grid">
          <ScoreCircle score={scores.total} />
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <span className="eyebrow">Free report</span>
              <span className="badge">{report.integrations.aiPowered ? `${report.integrations.aiProvider.toUpperCase()} analysis` : "Fallback analysis"}</span>
              <span className="badge">{report.integrations.pageSpeedMeasured ? "Google PageSpeed" : "Fallback performance"}</span>
              <span className="badge">Scanned {new Date(report.analysisTimestamp).toLocaleString()}</span>
            </div>
            <h2 className="report-title break-words">{report.url}</h2>
            <a href={report.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:text-blue-900">
              Open scanned page <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <p className="report-summary">{ai.plainEnglishSummary}</p>
            <div className="verdict-box">
              <p className="section-kicker font-bold uppercase tracking-[0.12em]">Final verdict</p>
              <p className="body-copy mt-2">{ai.finalVerdict}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="report-grid">
        <main className="report-main">
          <section className="surface report-card">
            <SectionHeader icon={<Lightbulb className="h-4 w-4" />} title="Top 3 high-impact fixes" text="The highest-leverage improvements to make first." />
            <div className="fix-list">
              {topFixes.map((fix, i) => (
                <div key={fix} className="fix-item">
                  <span className="fix-number">{i + 1}</span>
                  <p className="body-copy">{fix}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="surface report-card">
            <SectionHeader icon={<FileText className="h-4 w-4" />} title="Extracted metadata" text="The page signals AnswerRank found during the scan." />
            <div className="metadata-grid">
              {metadataRows.map(([label, value]) => (
                <div key={label} className="metadata-item">
                  <p className="section-kicker font-bold uppercase tracking-[0.12em]">{label}</p>
                  <p className="mt-2 break-words text-sm font-bold leading-6 text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="schema-grid">
            <div className="surface report-card">
              <SectionHeader icon={<Layers3 className="h-4 w-4" />} title="Schema found" text="Structured data detected on the scanned page." />
              {schemaFound.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {schemaFound.map((type) => <span key={type} className="badge bg-emerald-50 text-emerald-800">{type}</span>)}
                </div>
              ) : (
                <p className="body-copy mt-5">No JSON-LD schema was detected on the scanned page.</p>
              )}
            </div>

            <div className="surface report-card">
              <SectionHeader icon={<ShieldAlert className="h-4 w-4" />} title="Missing opportunities" text="Gaps that reduce answer-engine confidence." />
              <ul className="mt-5 space-y-3">
                {ai.aiSearchWeaknesses.slice(0, 3).map((weakness) => (
                  <li key={weakness} className="flex gap-3">
                    <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-amber-500" />
                    <p className="body-copy">{weakness}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="surface report-card">
            <SectionHeader icon={<MessageSquareText className="h-4 w-4" />} title="Recommended FAQs" text="Answer blocks that make the page easier for AI systems to cite." />
            <div className="faq-list">
              {ai.recommendedFaqs.slice(0, 3).map((faq) => (
                <div key={faq.question} className="faq-item">
                  <p className="text-sm font-extrabold text-slate-950">{faq.question}</p>
                  <p className="body-copy mt-2">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className="report-sidebar">
          <section className="surface report-card">
            <h3 className="section-heading">Category scores</h3>
            <div className="mt-5 space-y-3">
              <CategoryCard label="Metadata" score={scores.metadata} max={15} />
              <CategoryCard label="Headings" score={scores.headings} max={15} />
              <CategoryCard label="Schema" score={scores.schema} max={20} />
              <CategoryCard label="Content clarity" score={scores.contentClarity} max={20} />
              <CategoryCard label="AI readiness" score={scores.aiAnswerReadiness} max={15} />
              <CategoryCard label="Performance" score={scores.performance} max={15} />
            </div>
          </section>

          <section className="surface report-card">
            <p className="section-kicker font-bold uppercase tracking-[0.12em]">PageSpeed</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-950">{pageSpeedScore !== null ? `${pageSpeedScore}/100` : "Fallback"}</p>
            <p className="muted-copy mt-2">{pageSpeedScore !== null ? "Measured with Google PageSpeed Insights." : "Performance used fallback heuristics because PageSpeed did not return a score."}</p>
          </section>

          <section className="surface report-card">
            <p className="section-kicker font-bold uppercase tracking-[0.12em]">Integrations</p>
            <div className="mt-4 space-y-3">
              <ContextRow label="AI analysis" value={report.integrations.aiPowered ? `${report.integrations.aiProvider.toUpperCase()} API active` : "Deterministic fallback"} />
              <ContextRow label="Performance" value={report.integrations.pageSpeedMeasured ? "Google PageSpeed API active" : "Fallback heuristics"} />
            </div>
            {report.integrations.notes.length > 0 && (
              <div className="mt-4 space-y-2">
                {report.integrations.notes.map((note) => (
                  <p key={note} className="muted-copy">{note}</p>
                ))}
              </div>
            )}
          </section>

          <section className="surface report-card">
            <p className="section-kicker font-bold uppercase tracking-[0.12em]">Detected context</p>
            <ContextRow label="Business" value={ai.detectedBusinessType} />
            <ContextRow label="Audience" value={ai.targetAudience} />
          </section>
        </aside>
      </div>

      <section className="surface pro-card">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex-1">
            <SectionHeader icon={<Crown className="h-4 w-4" />} title="Pro Report locked" text="A clear paid upgrade path for the next Stripe step." />
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                "Full AI search breakdown",
                "Competitor/entity comparison",
                "Full schema recommendations",
                "10 recommended FAQs",
                "Exportable PDF report",
                "Priority implementation checklist",
              ].map((item) => (
                <div key={item} className="panel flex items-center gap-2 px-3 py-3 text-sm font-semibold text-slate-700">
                  <Lock className="h-3.5 w-3.5 flex-shrink-0 text-blue-700" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="lg:w-64">
              <button onClick={showUpgrade} className="btn btn-primary">Unlock Full Report - $14</button>
            <p className="muted-copy mt-3 text-center">One-time report purchase. No subscription yet.</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <button onClick={handleCopy} className="btn btn-secondary">
          {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy recommendations"}
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

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="metadata-item mt-4 min-h-0">
      <p className="section-kicker font-bold uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-1 text-sm font-bold leading-6 text-slate-900">{value}</p>
    </div>
  );
}
