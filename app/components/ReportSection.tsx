"use client";

import { AnalysisReport } from "@/types/report";
import ScoreCircle from "./ScoreCircle";
import CategoryCard from "./CategoryCard";
import { Copy, RotateCcw, AlertCircle, CheckCircle2, FileText, Share2, Image as ImageIcon, Link as LinkIcon, AlertTriangle, Sparkles, Globe } from "lucide-react";

interface Props {
  report: AnalysisReport;
  onReset: () => void;
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-3 drop-shadow-sm">
        <div className="p-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20">
          {icon}
        </div>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Tag({ text, subtle }: { text: string; subtle?: boolean }) {
  return (
    <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border shadow-sm transition-colors ${subtle ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10" : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20"}`}>
      {text}
    </span>
  );
}

function DataRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex flex-col gap-2 py-4 border-b border-white/5 last:border-b-0">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`text-sm ${muted ? "italic text-slate-500" : "text-slate-200 break-words font-medium"}`}>
        {value || "Not found"}
      </span>
    </div>
  );
}

export default function ReportSection({ report, onReset }: Props) {
  const { extractedData: d, scores, aiAnalysis: ai, pageSpeedScore } = report;

  const handleCopy = () => {
    const text = [
      `AnswerRank Scanner Report — ${report.url}`,
      `Overall Score: ${scores.total}/100`,
      "",
      "HIGH-IMPACT FIXES:",
      ...ai.highImpactFixes.map((f, i) => `${i + 1}. ${f}`),
      "",
      "FINAL VERDICT:",
      ai.finalVerdict,
    ].join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
  };

  return (
    <div className="flex flex-col gap-12 md:gap-20 animate-fade-in-up pb-20 px-4 sm:px-0">
      
      {/* ── Overall Score Header ── */}
      <div className="glass-card p-6 md:p-12 flex flex-col md:flex-row items-center md:items-start gap-10 md:gap-16 relative overflow-hidden">
        
        {/* Glow behind header */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="flex-shrink-0 relative z-10">
          <ScoreCircle score={scores.total} />
        </div>
        <div className="flex-1 flex flex-col gap-5 text-center md:text-left relative z-10">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white break-all mb-2 tracking-tight">{report.url}</h1>
            <p className="text-sm text-slate-400 flex items-center justify-center md:justify-start gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              Live Scan Completed • {new Date(report.analysisTimestamp).toLocaleString()}
            </p>
          </div>
          
          {ai.detectedBusinessType && ai.detectedBusinessType !== "Unknown — add OpenAI key for AI detection" && (
            <div className="flex flex-wrap justify-center md:justify-start gap-2.5">
              <Tag text={ai.detectedBusinessType} />
              {ai.targetAudience && ai.targetAudience !== "Unknown — add OpenAI key for AI detection" && (
                <Tag text={`Audience: ${ai.targetAudience}`} subtle />
              )}
              {pageSpeedScore !== null && (
                <Tag text={`Performance: ${pageSpeedScore}/100`} subtle />
              )}
            </div>
          )}
          
          <div className="mt-2 p-5 rounded-xl bg-black/40 border border-white/5 shadow-inner">
            <p className="text-sm leading-relaxed text-slate-300">
              {ai.plainEnglishSummary}
            </p>
          </div>
        </div>
      </div>

      {/* ── Final Verdict ── */}
      <div className="p-1 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-purple-500/20">
        <div className="p-6 md:p-8 rounded-[15px] bg-[#040508]/90 backdrop-blur-xl border border-white/5">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white mb-2 uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">AI Final Verdict</p>
              <p className="text-base leading-relaxed text-slate-200">{ai.finalVerdict}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-16">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 flex flex-col gap-16">
          
          {/* ── High Impact Fixes ── */}
          <Section title="High-Impact Fixes" icon={<AlertCircle className="w-4 h-4 text-indigo-400" />}>
            <div className="flex flex-col gap-4">
              {ai.highImpactFixes.map((fix, i) => (
                <div key={i} className="glass-card p-5 sm:p-6 flex gap-5 items-start group">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-sm font-bold text-indigo-300 flex-shrink-0 group-hover:bg-indigo-500/20 transition-colors">
                    {i + 1}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-300 mt-1">{fix}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── AI Weaknesses ── */}
          {ai.aiSearchWeaknesses.length > 0 && ai.aiSearchWeaknesses[0] !== "No critical weaknesses detected." && (
            <Section title="AI Search Weaknesses" icon={<AlertTriangle className="w-4 h-4 text-purple-400" />}>
              <div className="glass-card divide-y divide-white/5">
                {ai.aiSearchWeaknesses.map((w, i) => (
                  <div key={i} className="flex gap-4 p-5 sm:p-6 hover:bg-white/[0.02] transition-colors">
                    <span className="text-purple-400 mt-0.5 flex-shrink-0 font-bold">—</span>
                    <p className="text-sm text-slate-300 leading-relaxed">{w}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Extracted Data ── */}
          <Section title="Extracted Page Data" icon={<FileText className="w-4 h-4 text-cyan-400" />}>
            <div className="glass-card p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              <div className="flex flex-col">
                <DataRow label="Page Title" value={d.pageTitle} />
                <DataRow label="Meta Description" value={d.metaDescription} />
                <DataRow label="H1 Tag" value={d.h1Tags[0] ?? ""} />
              </div>
              <div className="flex flex-col">
                <DataRow label="Canonical URL" value={d.canonicalUrl} />
                <div className="py-5 border-b border-white/5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-3">Schema Types</span>
                  <div className="flex flex-wrap gap-2">
                    {d.schemaTypes.length > 0
                      ? d.schemaTypes.map((t) => <Tag key={t} text={t} subtle />)
                      : <span className="text-sm italic text-slate-500">None found</span>}
                  </div>
                </div>
                <div className="py-5 grid grid-cols-3 gap-4">
                  <div className="glass-card p-4 border-none bg-black/20 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-2 text-slate-400"><ImageIcon className="w-3 h-3" /><span className="text-xs font-medium uppercase">Alt</span></div>
                    <p className="text-xl font-bold text-white">{d.imagesMissingAlt}</p>
                  </div>
                  <div className="glass-card p-4 border-none bg-black/20 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-2 text-slate-400"><LinkIcon className="w-3 h-3" /><span className="text-xs font-medium uppercase">Int</span></div>
                    <p className="text-xl font-bold text-white">{d.internalLinks}</p>
                  </div>
                  <div className="glass-card p-4 border-none bg-black/20 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-2 text-slate-400"><Share2 className="w-3 h-3" /><span className="text-xs font-medium uppercase">Ext</span></div>
                    <p className="text-xl font-bold text-white">{d.externalLinks}</p>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-16">
          
          {/* ── Score Breakdown ── */}
          <Section title="Category Scores" icon={<CheckCircle2 className="w-4 h-4 text-indigo-400" />}>
            <div className="flex flex-col gap-3.5">
              <CategoryCard label="Metadata" score={scores.metadata} max={15} />
              <CategoryCard label="Headings" score={scores.headings} max={15} />
              <CategoryCard label="Schema Markup" score={scores.schema} max={20} />
              <CategoryCard label="Content Clarity" score={scores.contentClarity} max={20} />
              <CategoryCard label="AI Answer Readiness" score={scores.aiAnswerReadiness} max={15} />
              <CategoryCard label="Performance" score={scores.performance} max={15} />
            </div>
          </Section>

          {/* ── Entity Map ── */}
          <Section title="Entity Map" icon={<Globe className="w-4 h-4 text-cyan-400" />}>
            <div className="glass-card p-6 flex flex-col gap-8">
              {[
                { label: "Detected Brands / Products", items: ai.detectedEntities.slice(0, 4) },
                { label: "Missing Entities", items: ai.missingEntities.slice(0, 4) },
              ].map(({ label, items }) => (
                <div key={label} className="flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                  <div className="flex flex-wrap gap-2.5">
                    {items.filter(Boolean).length > 0 ? (
                      items.filter(Boolean).map((item) => (
                        <Tag key={item} text={item} subtle />
                      ))
                    ) : (
                      <span className="text-sm italic text-slate-600">None detected</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>

        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex flex-col sm:flex-row gap-5 justify-center mt-12 pt-12 border-t border-white/5">
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-white/10 text-sm font-semibold text-white bg-white/5 hover:bg-white/10 transition-all w-full sm:w-auto shadow-sm"
        >
          <Copy className="w-4 h-4" />
          Copy Overview
        </button>
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl btn-primary text-sm font-semibold transition-all w-full sm:w-auto"
        >
          <RotateCcw className="w-4 h-4" />
          Scan Another URL
        </button>
      </div>

    </div>
  );
}
