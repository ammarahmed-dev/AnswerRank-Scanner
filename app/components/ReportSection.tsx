"use client";

import { AnalysisReport } from "@/types/report";
import ScoreCircle from "./ScoreCircle";
import CategoryCard from "./CategoryCard";
import { Copy, RotateCcw, Lock, Sparkles } from "lucide-react";
import { useState } from "react";

interface Props { report: AnalysisReport; onReset: () => void; }

export default function ReportSection({ report, onReset }: Props) {
  const { extractedData: d, scores, aiAnalysis: ai, pageSpeedScore } = report;
  const [notice, setNotice] = useState("");

  const handleCopy = () => navigator.clipboard.writeText(`AnswerRank report for ${report.url}\nOverall: ${scores.total}/100`).catch(() => {});
  const showUpgrade = () => { setNotice("Stripe checkout will be connected in the next step."); setTimeout(() => setNotice(""), 2500); };

  return <div className="flex flex-col gap-10 pb-20 px-4 sm:px-0">
    <div className="glass-card p-6 md:p-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
      <ScoreCircle score={scores.total} />
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-white break-all">{report.url}</h2>
        <p className="text-slate-400 text-sm mt-1">Scanned {new Date(report.analysisTimestamp).toLocaleString()}</p>
        <p className="mt-4 text-slate-300">{ai.plainEnglishSummary}</p>
        <p className="mt-3 text-indigo-300 text-sm">Final verdict: {ai.finalVerdict}</p>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-card p-6"><h3 className="text-white font-semibold mb-4">Top 3 High-Impact Fixes</h3>{ai.highImpactFixes.slice(0,3).map((f,i)=><p key={i} className="text-slate-300 text-sm mb-2">{i+1}. {f}</p>)}</div>
        <div className="glass-card p-6"><h3 className="text-white font-semibold mb-4">Extracted Metadata</h3><div className="text-sm text-slate-300 space-y-2"><p><span className="text-slate-400">Title:</span> {d.pageTitle || "Not found"}</p><p><span className="text-slate-400">Meta:</span> {d.metaDescription || "Not found"}</p><p><span className="text-slate-400">Canonical:</span> {d.canonicalUrl || "Not found"}</p><p><span className="text-slate-400">H1:</span> {d.h1Tags[0] || "Not found"}</p></div></div>
        <div className="glass-card p-6"><h3 className="text-white font-semibold mb-4">Schema Found & Missing Opportunities</h3><p className="text-sm text-slate-300 mb-2">Found: {d.schemaTypes.length ? d.schemaTypes.join(", ") : "None"}</p><p className="text-sm text-slate-300">Missing opportunities: {ai.schemaRecommendations.slice(0,2).join(" ")}</p></div>
      </div>
      <div className="space-y-4">
        <CategoryCard label="Metadata" score={scores.metadata} max={15} />
        <CategoryCard label="Headings" score={scores.headings} max={15} />
        <CategoryCard label="Schema" score={scores.schema} max={20} />
        <CategoryCard label="AI Readiness" score={scores.aiAnswerReadiness} max={15} />
        <CategoryCard label="Performance" score={scores.performance} max={15} />
        {pageSpeedScore !== null && <div className="glass-card p-4 text-sm text-slate-300">Google PageSpeed: {pageSpeedScore}/100</div>}
      </div>
    </div>

    <div className="glass-card p-6 border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
      <div className="flex items-start gap-4"><Lock className="w-5 h-5 text-indigo-300 mt-1" /><div><p className="text-white font-semibold">Pro Report (Locked)</p><ul className="text-sm text-slate-300 mt-2 list-disc pl-5"><li>Full AI search breakdown</li><li>Competitor/entity comparison</li><li>Full schema recommendations</li><li>10 recommended FAQs</li><li>Exportable PDF + priority checklist</li></ul><button onClick={showUpgrade} className="btn-primary mt-4 px-5 py-2.5 text-sm font-semibold">Unlock Full Report — $9</button>{notice && <p className="text-cyan-300 text-sm mt-2">{notice}</p>}</div></div>
    </div>

    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
      <button onClick={handleCopy} className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-sm font-semibold text-white bg-white/5"><Copy className="w-4 h-4" />Copy recommendations</button>
      <button onClick={onReset} className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl btn-primary text-sm font-semibold"><RotateCcw className="w-4 h-4" />Scan another URL</button>
      <div className="hidden sm:flex items-center text-xs text-slate-400"><Sparkles className="w-3 h-3 mr-1" />Demo-ready one-page SaaS</div>
    </div>
  </div>;
}
