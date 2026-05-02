"use client";

import { useState, useRef, useEffect } from "react";
import LoadingState from "./components/LoadingState";
import ReportSection from "./components/ReportSection";
import { AnalysisReport } from "@/types/report";
import { Sparkles, Globe, ArrowRight, Activity, Search, LineChart } from "lucide-react";

type AppState = "idle" | "loading" | "done" | "error" | "paywall";

const LOADING_STEP_TIMES = [900, 1800, 3000, 4700, 6800, 8600];
const MAX_CRAWLS = 5;

export default function Home() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<AppState>("idle");
  const [loadingStep, setLoadingStep] = useState(0);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [crawlCount, setCrawlCount] = useState<number>(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem("answerrank_crawls");
    if (stored) setCrawlCount(parseInt(stored, 10));
  }, []);

  useEffect(() => {
    if (state !== "loading") return;
    setLoadingStep(0);
    const timers = LOADING_STEP_TIMES.map((ms, i) => setTimeout(() => setLoadingStep(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, [state]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (crawlCount >= MAX_CRAWLS) return setState("paywall");
    const trimmed = url.trim();
    if (!trimmed) return inputRef.current?.focus();

    setState("loading");
    setReport(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: trimmed }) });
      const data = (await res.json()) as AnalysisReport & { error?: string };
      if (!res.ok || data.error) {
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        return setState("error");
      }
      const newCount = crawlCount + 1;
      setCrawlCount(newCount);
      localStorage.setItem("answerrank_crawls", newCount.toString());
      setReport(data);
      setState("done");
      setTimeout(() => document.getElementById("report-top")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setState("error");
    }
  };

  const handleReset = () => {
    if (crawlCount >= MAX_CRAWLS) return setState("paywall");
    setState("idle");
    setReport(null);
    setErrorMsg("");
    setUrl("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return <main className="min-h-screen relative overflow-hidden">{/* unchanged layout */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] opacity-30 pointer-events-none" style={{ background: "radial-gradient(ellipse at top, rgba(99, 102, 241, 0.4), transparent 70%)" }}></div>
    <div className="max-w-6xl mx-auto px-5 md:px-8 py-6 md:py-10 relative z-10">
      <div className="flex justify-between items-center mb-16 animate-fade-in"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center"><Sparkles className="w-4 h-4 text-indigo-300" /></div><span className="font-bold text-lg tracking-tight text-white/95">AnswerRank</span></div>{isClient && <div className="glass-card px-4 py-1.5 rounded-full text-sm text-slate-300 font-medium">{MAX_CRAWLS - crawlCount} free scans</div>}</div>
      {(state === "idle" || state === "done" || state === "loading" || state === "error") && <div className={`flex flex-col items-center text-center gap-8 transition-all duration-700 ${state === "done" ? "pb-12 mb-12 opacity-0 h-0 overflow-hidden" : "py-10 md:py-20 opacity-100 h-auto"}`}><div className="flex flex-col gap-6 max-w-4xl mx-auto px-4 relative"><h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.1]">AI Visibility <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400">Readiness Scanner</span></h1><p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">Scan any page and get a premium AI search readiness report with prioritized fixes.</p></div>
      <form onSubmit={handleScan} className="w-full max-w-2xl flex flex-col sm:flex-row gap-3 mt-6 px-4 sm:px-0 relative z-20"><div className="flex-1 relative group"><div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400"><Globe className="w-5 h-5" /></div><input ref={inputRef} type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourwebsite.com" disabled={state === "loading"} className="w-full pl-14 pr-5 py-4 text-base input-premium disabled:opacity-50" /></div><button type="submit" disabled={state === "loading" || !url.trim()} className="px-8 py-4 text-base font-semibold btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap">{state === "loading" ? "Scanning..." : <>Scan Website <ArrowRight className="w-5 h-5" /></>}</button></form>
      {state === "idle" && <div className="flex flex-wrap justify-center gap-4 mt-6 animate-fade-in delay-200 px-4">{[{ icon: <Search className="w-4 h-4 text-cyan-400" />, text: "Schema Extraction" },{ icon: <Activity className="w-4 h-4 text-indigo-400" />, text: "Entity Detection" },{ icon: <LineChart className="w-4 h-4 text-purple-400" />, text: "AI Readiness Score" }].map((f, i) => <div key={i} className="glass-card px-4 py-2 rounded-full flex items-center gap-2">{f.icon}<span className="text-sm font-medium text-slate-300">{f.text}</span></div>)}</div>}</div>}
      {state === "error" && <div className="max-w-2xl mx-auto glass-card p-6 border-red-500/30 bg-red-500/5 mb-10"><p className="font-semibold text-red-300 text-lg mb-1">Analysis Failed</p><p className="text-slate-400 leading-relaxed mb-4">{errorMsg}</p><button onClick={handleReset} className="px-5 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300">Try another URL</button></div>}
      {state === "loading" && <div className="py-12"><LoadingState step={loadingStep} /></div>}
      {state === "done" && report && <div id="report-top" className="animate-fade-in-up"><ReportSection report={report} onReset={handleReset} /></div>}
      {state === "paywall" && <div className="glass-card p-8 max-w-2xl mx-auto text-center"><p className="text-xl font-semibold text-white mb-3">Free demo limit reached</p><p className="text-slate-400">Demo scans are capped for now. Stripe checkout will be connected in the next step.</p></div>}
    </div>
  </main>;
}
