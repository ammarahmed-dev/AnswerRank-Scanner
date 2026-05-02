"use client";

import { useState, useRef, useEffect } from "react";
import LoadingState from "./components/LoadingState";
import ReportSection from "./components/ReportSection";
import { AnalysisReport } from "@/types/report";
import { Sparkles, Globe, Lock, ArrowRight, Check, Activity, Search, LineChart, Crown } from "lucide-react";

type AppState = "idle" | "loading" | "done" | "error" | "paywall";

const LOADING_STEP_TIMES = [1000, 2000, 3500, 5500, 8000];
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
    if (stored) {
      setCrawlCount(parseInt(stored, 10));
    }
  }, []);

  useEffect(() => {
    if (state !== "loading") return;
    setLoadingStep(0);
    const timers = LOADING_STEP_TIMES.map((ms, i) =>
      setTimeout(() => setLoadingStep(i + 1), ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [state]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (crawlCount >= MAX_CRAWLS) {
      setState("paywall");
      return;
    }

    const trimmed = url.trim();
    if (!trimmed) { inputRef.current?.focus(); return; }

    setState("loading");
    setReport(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json() as AnalysisReport & { error?: string };
      
      if (!res.ok || data.error) {
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }
      
      const newCount = crawlCount + 1;
      setCrawlCount(newCount);
      localStorage.setItem("answerrank_crawls", newCount.toString());

      setReport(data);
      setState("done");
      setTimeout(() => {
        document.getElementById("report-top")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setState("error");
    }
  };

  const handleReset = () => {
    if (crawlCount >= MAX_CRAWLS) {
      setState("paywall");
      return;
    }
    setState("idle");
    setReport(null);
    setErrorMsg("");
    setUrl("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <main className="min-h-screen relative overflow-hidden">
      
      {/* Dynamic top light flare */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] opacity-30 pointer-events-none" style={{ background: "radial-gradient(ellipse at top, rgba(99, 102, 241, 0.4), transparent 70%)" }}></div>

      <div className="max-w-6xl mx-auto px-5 md:px-8 py-6 md:py-10 relative z-10">

        {/* ── Top Bar ── */}
        <div className="flex justify-between items-center mb-16 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Sparkles className="w-4 h-4 text-indigo-300" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white/95">AnswerRank</span>
          </div>
          {isClient && (
            <div className="glass-card px-4 py-1.5 rounded-full flex items-center gap-2 text-sm text-slate-300 font-medium">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </div>
              {MAX_CRAWLS - crawlCount} free scans
            </div>
          )}
        </div>

        {/* ── Hero / Input ── */}
        {(state === "idle" || state === "done" || state === "loading" || state === "error") && (
          <div className={`flex flex-col items-center text-center gap-8 transition-all duration-700 ${state === "done" ? "pb-12 mb-12 opacity-0 h-0 overflow-hidden" : "py-10 md:py-20 opacity-100 h-auto"}`}>
            
            {/* Headline */}
            <div className="flex flex-col gap-6 max-w-4xl mx-auto px-4 relative">
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.1]">
                Optimize your website for <br className="hidden sm:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400" style={{ filter: "drop-shadow(0 0 40px rgba(99,102,241,0.3))" }}>
                  the AI search era.
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-light">
                Generate an instant AI Visibility Readiness Report. See exactly what LLMs, AI agents, and answer engines extract from your URL.
              </p>
            </div>

            {/* Input form */}
            <form onSubmit={handleScan} className="w-full max-w-2xl flex flex-col sm:flex-row gap-3 mt-6 px-4 sm:px-0 relative z-20">
              <div className="flex-1 relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Globe className="w-5 h-5" />
                </div>
                <input
                  ref={inputRef}
                  id="url-input"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  disabled={state === "loading"}
                  className="w-full pl-14 pr-5 py-4 text-base input-premium disabled:opacity-50"
                />
              </div>
              <button
                id="scan-btn"
                type="submit"
                disabled={state === "loading" || !url.trim()}
                className="px-8 py-4 text-base font-semibold btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {state === "loading" ? "Scanning..." : (
                  <>
                    Scan Website
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Feature pills */}
            {state === "idle" && (
              <div className="flex flex-wrap justify-center gap-4 mt-6 animate-fade-in delay-200 px-4">
                {[
                  { icon: <Search className="w-4 h-4 text-cyan-400" />, text: "Schema Extraction" },
                  { icon: <Activity className="w-4 h-4 text-indigo-400" />, text: "Entity Detection" },
                  { icon: <LineChart className="w-4 h-4 text-purple-400" />, text: "AI Readiness Score" }
                ].map((f, i) => (
                  <div key={i} className="glass-card px-4 py-2 rounded-full flex items-center gap-2">
                    {f.icon}
                    <span className="text-sm font-medium text-slate-300">{f.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Error ── */}
        {state === "error" && (
          <div className="max-w-2xl mx-auto glass-card p-6 border-red-500/30 bg-red-500/5 mb-10 animate-fade-in shadow-[0_0_30px_rgba(239,68,68,0.1)]">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-red-400 text-xl font-bold">!</span>
              </div>
              <div className="flex-1 mt-1">
                <p className="font-semibold text-red-300 text-lg mb-1">Analysis Failed</p>
                <p className="text-slate-400 leading-relaxed mb-4">{errorMsg}</p>
                <button onClick={handleReset} className="px-5 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 font-medium hover:bg-red-500/20 transition-colors">
                  Try another URL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {state === "loading" && (
          <div className="py-12">
            <LoadingState step={loadingStep} />
          </div>
        )}

        {/* ── Report ── */}
        {state === "done" && report && (
          <div id="report-top" className="animate-fade-in-up">
            <ReportSection report={report} onReset={handleReset} />
          </div>
        )}

        {/* ── Paywall (Limit Reached) ── */}
        {state === "paywall" && (
          <div className="max-w-lg mx-auto animate-fade-in-up mt-8 px-4">
            <div className="glass-card p-8 md:p-10 flex flex-col items-center text-center relative overflow-hidden">
              
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500"></div>
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none"></div>
              
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                <Lock className="w-8 h-8 text-indigo-300" />
              </div>
              
              <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">Scan Limit Reached</h2>
              <p className="text-base leading-relaxed text-slate-400 mb-8">
                You've used all {MAX_CRAWLS} of your free AI Visibility scans. Upgrade to AnswerRank Pro to unlock unlimited deep-crawls and premium SEO insights.
              </p>

              <div className="w-full bg-black/40 rounded-xl p-6 border border-white/5 mb-8 text-left shadow-inner">
                <div className="flex justify-between items-center border-b border-white/5 pb-5 mb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="w-5 h-5 text-amber-400" />
                      <span className="font-bold text-white text-lg">Pro Plan</span>
                    </div>
                    <p className="text-sm text-slate-400">Unlimited AI crawls & reporting</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-white">$29</span>
                    <span className="text-sm text-slate-400">/mo</span>
                  </div>
                </div>
                <ul className="flex flex-col gap-3.5">
                  {["Unlimited Website Scans", "Export to PDF/CSV", "Priority AI Processing Queue", "White-label Client Reports"].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-slate-300 font-medium">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-indigo-400" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                className="w-full py-4 text-base font-bold btn-primary"
                onClick={() => alert("Redirecting to checkout... (Mock)")}
              >
                Upgrade to Pro
              </button>
              
              <button 
                onClick={() => setState("idle")}
                className="mt-6 text-sm text-slate-500 hover:text-slate-300 transition-colors font-medium"
              >
                Return to Home
              </button>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        {state === "idle" && (
          <div className="mt-32 flex flex-col items-center gap-2 animate-fade-in delay-500">
            <p className="text-sm text-slate-600 font-medium">
              AnswerRank Scanner • Designed for the AI Era
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
