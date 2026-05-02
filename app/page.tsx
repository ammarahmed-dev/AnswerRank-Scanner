"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import LoadingState from "./components/LoadingState";
import ReportSectionNew from "./components/ReportSectionNew";
import { AnalysisReport } from "@/types/report";
import { ScanResult } from "@/types/index";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  Globe,
  Layers3,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  WandSparkles,
} from "lucide-react";

type AppState = "idle" | "loading" | "done" | "error" | "paywall";

const LOADING_STEP_TIMES = [900, 1800, 3000, 4700, 6800, 8600];
const MAX_CRAWLS = 5;

const trustStats = [
  { value: "6", label: "Readiness categories", text: "Metadata, headings, schema, clarity, AI readiness, and performance." },
  { value: "3", label: "Priority fixes", text: "The free report focuses attention on the highest-impact work first." },
  { value: "0", label: "Setup required", text: "No login, no database, and deterministic fallback scoring for demos." },
  { value: "$9", label: "Pro report path", text: "A realistic locked upgrade section ready for Stripe checkout next." },
];

const auditSignals = [
  { icon: FileText, title: "Metadata clarity", text: "Title, description, canonical, social metadata, and heading structure." },
  { icon: Layers3, title: "Structured data", text: "JSON-LD detection, schema types, and missed markup opportunities." },
  { icon: Target, title: "Answer readiness", text: "Checks if the page is easy for AI assistants to summarize and cite." },
  { icon: BarChart3, title: "Priority scoring", text: "A weighted 0-100 score with category-level diagnostics." },
];

const workflow = [
  { title: "Paste a public website URL", text: "The scanner normalizes the URL and fetches the public HTML with bot-aware error handling." },
  { title: "Extract the page signals", text: "It reads metadata, headings, schema, links, image alt coverage, and content depth." },
  { title: "Score AI visibility readiness", text: "The report converts technical signals into a weighted score and plain-English verdict." },
  { title: "Act on the highest-impact fixes", text: "Copy the recommendations, add FAQs/schema, or tease the paid Pro Report workflow." },
];

const faqs = [
  ["Does it work without API keys?", "Yes. The free scanner uses deterministic fallback scoring when OpenAI or PageSpeed keys are not configured."],
  ["Is Stripe connected?", "Not yet. The Pro Report section is a locked teaser and shows a checkout placeholder message."],
  ["Does this store scanned URLs?", "No. There is no auth and no database in this MVP."],
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<AppState>("idle");
  const [loadingStep, setLoadingStep] = useState(0);
  const [report, setReport] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [crawlCount, setCrawlCount] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, includeAI: false }),
      });
      const data = (await res.json()) as ScanResult & { error?: string };
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

  return (
    <main className="min-h-screen">
      <header className="site-header">
        <a href="#" className="brand-lockup" aria-label="AnswerRank home">
          <span className="brand-mark"><Sparkles className="h-5 w-5" /></span>
          <span>
            <span className="brand-name">AnswerRank</span>
            <span className="brand-subtitle">AI visibility scanner</span>
          </span>
        </a>
        <nav className="site-nav" aria-label="Primary navigation">
          <a href="#how">How it works</a>
          <a href="#report">Report</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="header-actions">
          {isClient && <span className="header-pill">{Math.max(0, MAX_CRAWLS - crawlCount)} free scans left</span>}
          <a href="#scanner" className="btn btn-primary header-cta">Scan now</a>
        </div>
      </header>

      {state !== "done" && (
        <>
          <section className="launch-hero" id="scanner">
            <div className="hero-media" aria-hidden="true" />
            <div className="launch-container hero-content">
              <div className="hero-copy-block">
                <p className="launch-eyebrow"><ShieldCheck className="h-4 w-4" /> Free public-page audit</p>
                <h1>See how ready your website is for AI search.</h1>
                <p className="hero-lede">
                  AnswerRank scans your page and turns metadata, schema, content clarity, and answer-readiness signals into a prioritized visibility report.
                </p>
                <form onSubmit={handleScan} className="hero-scanner" aria-label="Scan a website">
                  <div className="hero-input-wrap">
                    <Globe className="h-5 w-5" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://webflow.com"
                      disabled={state === "loading"}
                    />
                  </div>
                  <button type="submit" disabled={state === "loading" || !url.trim()} className="btn btn-primary hero-scan-button">
                    {state === "loading" ? "Scanning" : "Scan Website"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
                <div className="hero-assurance">
                  <span><CheckCircle2 className="h-4 w-4" /> No signup</span>
                  <span><CheckCircle2 className="h-4 w-4" /> No database</span>
                  <span><CheckCircle2 className="h-4 w-4" /> Works without keys</span>
                </div>
              </div>

              <div className="product-visual" id="report">
                <div className="visual-toolbar">
                  <span />
                  <span />
                  <span />
                  <strong>AI Visibility Readiness Report</strong>
                </div>
                <div className="visual-score-row">
                  <div className="visual-score">83</div>
                  <div>
                    <p>Overall AI visibility score</p>
                    <small>Metadata strong, schema partial, FAQs missing</small>
                  </div>
                </div>
                <div className="visual-bars">
                  {["Metadata", "Schema", "Answer readiness", "Performance"].map((label, index) => (
                    <div key={label}>
                      <div className="visual-bar-label"><span>{label}</span><span>{[15, 17, 10, 11][index]}/20</span></div>
                      <div className="visual-bar"><span style={{ width: `${[92, 78, 58, 66][index]}%` }} /></div>
                    </div>
                  ))}
                </div>
                <div className="visual-fixes">
                  <p><WandSparkles className="h-4 w-4" /> Add FAQPage schema for answer extraction.</p>
                  <p><WandSparkles className="h-4 w-4" /> Clarify primary entity and audience language.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="stats-band">
            <div className="launch-container stats-grid">
              {trustStats.map(({ value, label, text }) => (
                <div key={label}>
                  <strong>{value}</strong>
                  <span>{label}</span>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </section>

          {state === "error" && (
            <section className="launch-container">
              <div className="error-banner">
                <AlertCircle className="h-5 w-5" />
                <div>
                  <strong>Analysis failed</strong>
                  <p>{errorMsg}</p>
                </div>
                <button onClick={handleReset} className="btn btn-danger">Try another URL</button>
              </div>
            </section>
          )}

          <section className="image-story-section">
            <div className="launch-container image-story-grid">
              <div className="answer-map-visual" aria-label="AI visibility signal map">
                <div className="answer-node answer-node-primary">
                  <Search className="h-5 w-5" />
                  <strong>AI Search</strong>
                </div>
                <div className="signal-orbit">
                  <span style={{ "--x": "16%", "--y": "16%" } as CSSProperties}>Metadata</span>
                  <span style={{ "--x": "70%", "--y": "18%" } as CSSProperties}>Schema</span>
                  <span style={{ "--x": "12%", "--y": "62%" } as CSSProperties}>FAQs</span>
                  <span style={{ "--x": "66%", "--y": "70%" } as CSSProperties}>Entities</span>
                  <span style={{ "--x": "42%", "--y": "84%" } as CSSProperties}>Clarity</span>
                </div>
                <div className="answer-card-preview">
                  <p>Readiness score</p>
                  <strong>83/100</strong>
                  <small>3 priority fixes found</small>
                </div>
              </div>
              <div className="story-content">
                <p className="launch-eyebrow">Why it matters</p>
                <h2>Search is becoming answer-first. Your site needs machine-readable proof.</h2>
                <p>
                  Buyers increasingly discover brands through AI summaries, answer engines, and LLM-assisted workflows. AnswerRank helps you see whether your page gives those systems enough clear signals to understand, rank, and cite your business.
                </p>
                <div className="story-checks">
                  <span><CheckCircle2 className="h-4 w-4" /> Brand and entity clarity</span>
                  <span><CheckCircle2 className="h-4 w-4" /> Structured data coverage</span>
                  <span><CheckCircle2 className="h-4 w-4" /> Recommended answer blocks</span>
                </div>
              </div>
            </div>
          </section>

          <section className="launch-section" id="how">
            <div className="launch-container">
              <div className="section-intro">
                <p className="launch-eyebrow">How it works</p>
                <h2>From one URL to a practical AI visibility report.</h2>
              </div>
              <div className="process-list">
                {workflow.map((item, index) => (
                  <div key={item.title} className="process-item">
                    <span>{index + 1}</span>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="launch-section muted-section">
            <div className="launch-container">
              <div className="section-intro">
                <p className="launch-eyebrow">What the audit checks</p>
                <h2>Six readiness areas, translated into business-friendly actions.</h2>
              </div>
              <div className="signal-grid">
                {auditSignals.map(({ icon: Icon, title, text }) => (
                  <article key={title} className="signal-row">
                    <Icon className="h-5 w-5" />
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="pricing-section" id="pricing">
            <div className="launch-container pricing-grid">
              <div>
                <p className="launch-eyebrow">Pricing preview</p>
                <h2>Useful free scans now. A paid Pro Report path when Stripe is ready.</h2>
                <p>The free report includes the core score, metadata, schema found, top fixes, FAQs, and final verdict. The locked Pro section teases the commercial upgrade without adding auth, a database, or checkout yet.</p>
              </div>
              <div className="pricing-panel">
                <span className="price">$9</span>
                <strong>Pro Report</strong>
                <ul>
                  <li><Lock className="h-4 w-4" /> Full AI search breakdown</li>
                  <li><Lock className="h-4 w-4" /> Competitor/entity comparison</li>
                  <li><Lock className="h-4 w-4" /> Exportable PDF checklist</li>
                </ul>
                <button onClick={() => alert("Stripe checkout will be connected in the next step.")} className="btn btn-primary">Unlock Full Report</button>
              </div>
            </div>
          </section>

          <section className="faq-section" id="faq">
            <div className="launch-container faq-grid">
              <div className="section-intro">
                <p className="launch-eyebrow">FAQ</p>
                <h2>Built for simple demos and fast validation.</h2>
              </div>
              <div className="faq-rows">
                {faqs.map(([question, answer]) => (
                  <details key={question}>
                    <summary>{question}</summary>
                    <p>{answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {state === "loading" && (
        <div className="loading-overlay" role="dialog" aria-modal="true" aria-label="Running AI visibility scan">
          <div className="loading-dialog">
            <LoadingState step={loadingStep} />
          </div>
        </div>
      )}

      {state === "done" && report && (
        <section className="report-page" id="report-top">
          <div className="launch-container report-header-row">
            <a href="#" className="brand-lockup">
              <span className="brand-mark"><Sparkles className="h-5 w-5" /></span>
              <span>
                <span className="brand-name">AnswerRank</span>
                <span className="brand-subtitle">AI visibility scanner</span>
              </span>
            </a>
            {isClient && <span className="header-pill">{Math.max(0, MAX_CRAWLS - crawlCount)} free scans left</span>}
          </div>
          <div className="animate-fade-in-up">
            <ReportSectionNew report={report} onReset={handleReset} />
          </div>
        </section>
      )}

      {state === "paywall" && (
        <section className="launch-container paywall-section">
          <div className="pricing-panel">
            <span className="price">$9</span>
            <strong>Free demo limit reached</strong>
            <p>Stripe checkout will be connected in the next step.</p>
            <button onClick={() => setState("idle")} className="btn btn-primary">Back to scanner</button>
          </div>
        </section>
      )}

      <footer className="site-footer">
        <div className="launch-container footer-grid">
          <div>
            <div className="brand-lockup">
              <span className="brand-mark"><Sparkles className="h-5 w-5" /></span>
              <span>
                <span className="brand-name">AnswerRank</span>
                <span className="brand-subtitle">AI visibility scanner</span>
              </span>
            </div>
            <p>One-page SaaS MVP for AI visibility readiness reports.</p>
          </div>
          <div>
            <a href="#scanner">Scanner</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
