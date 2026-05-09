"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import LoadingState from "./components/LoadingState";
import SiteFooter from "./components/SiteFooter";
import SiteHeader from "./components/SiteHeader";
import UpgradeButton from "./components/UpgradeButton";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ScanResult } from "@/types/index";
import { useRouter } from "next/navigation";
import { canRunScan, isMasterAdmin, isProUser } from "@/lib/access";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  Globe,
  Layers3,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Target,
  WandSparkles,
} from "lucide-react";

type AppState = "idle" | "loading" | "done" | "error" | "paywall";

const LOADING_STEP_TIMES = [900, 1800, 3000, 4700, 6800, 8600];
const CLIENT_STORAGE_KEY = "answerrank_client_id_v1";

const trustStats = [
  { value: "6", label: "Readiness categories", text: "Metadata, headings, schema, clarity, AI readiness, and performance." },
  { value: "3", label: "Priority fixes", text: "The free report focuses attention on the highest-impact work first." },
  { value: "0", label: "Setup required", text: "No signup and no onboarding steps. Paste a public page and scan immediately." },
  { value: "$9", label: "Pro report", text: "Stripe Checkout is connected in sandbox mode for test upgrades and plan validation." },
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
  ["Does it work without signup?", "Yes. You can run a free public-page scan instantly with no account required."],
  ["What does the scanner check?", "It checks schema, metadata, heading structure, content clarity, entity signals, and answer-readiness gaps on a public page."],
  ["Is this the same as a traditional SEO audit?", "Not exactly. This is a focused AI visibility audit designed for answer engines and AI-assisted discovery."],
  ["Is Stripe connected?", "Yes. Stripe Checkout is connected in sandbox mode for testing. Live billing can be enabled at launch."],
  ["Does this store scanned URLs?", "For this MVP flow, scans are presented as a one-page report and are not positioned as a persistent scan history product."],
];

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [state, setState] = useState<AppState>("idle");
  const [loadingStep, setLoadingStep] = useState(0);
  const [report, setReport] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [account, setAccount] = useState<{ plan: "guest" | "free" | "pro" | "agency"; isAdmin: boolean; remaining: number | null; unlimited: boolean } | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [clientId, setClientId] = useState("");
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [competitorUrls, setCompetitorUrls] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsClient(true);
    const storedClientId = localStorage.getItem(CLIENT_STORAGE_KEY);
    const nextClientId = storedClientId || crypto.randomUUID();
    localStorage.setItem(CLIENT_STORAGE_KEY, nextClientId);
    setClientId(nextClientId);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadAccount() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const token = (await getSafeSupabaseSession(supabase))?.access_token;
      if (!token) {
        if (active) setAccount({ plan: "guest", isAdmin: false, remaining: null, unlimited: false });
        return;
      }
      try {
        const res = await fetch("/api/account", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { profile: { plan: "guest" | "free" | "pro" | "agency"; isAdmin?: boolean }; usage: { remaining: number | null; unlimited: boolean } };
        if (!active) return;
        setAccount({
          plan: data.profile.plan,
          isAdmin: Boolean(data.profile.isAdmin),
          remaining: data.usage.remaining,
          unlimited: data.usage.unlimited,
        });
      } catch {
        return;
      }
    }
    loadAccount();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (state !== "loading") return;
    setLoadingStep(0);
    const timers = LOADING_STEP_TIMES.map((ms, i) => setTimeout(() => setLoadingStep(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, [state]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (account && !canRunScan({ plan: account.plan, isAdmin: account.isAdmin }, account.remaining)) return setState("paywall");
    const trimmed = url.trim();
    if (!trimmed) return inputRef.current?.focus();
    const competitors = competitorUrls
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);

    setState("loading");
    setReport(null);
    setErrorMsg("");

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 65000);
      const supabase = getSupabaseBrowserClient();
      const token = (await getSafeSupabaseSession(supabase))?.access_token;
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url: trimmed, includeAI: true, clientId }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = (await res.json()) as ScanResult & { error?: string };
      if (!res.ok || data.error) {
        if (res.status === 429) {
          setErrorMsg(data.error ?? "Free scan limit reached for today.");
          return setState("paywall");
        }
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        return setState("error");
      }
      if (competitors.length) {
        data.competitorUrls = competitors;
      }
      if (data.reportId) {
        sessionStorage.setItem(`answerrank_report:${data.reportId}`, JSON.stringify(data));
      }
      sessionStorage.setItem(`answerrank_report:${data.url}`, JSON.stringify(data));
      setReport(data);
      setState("done");
      router.push(data.reportId ? `/report?id=${data.reportId}` : `/report?url=${encodeURIComponent(data.url)}`);
    } catch (err) {
      setErrorMsg(err instanceof DOMException && err.name === "AbortError"
        ? "The scan took too long. External AI or performance APIs may be slow. Please try again."
        : "Network error. Please check your connection and try again.");
      setState("error");
    }
  };

  const handleReset = () => {
    setState("idle");
    setReport(null);
    setErrorMsg("");
    setUrl("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const scanCountLabel = account && isMasterAdmin({ plan: account.plan, isAdmin: account.isAdmin })
    ? "Master Admin · Unlimited Access"
    : account && (account.unlimited || isProUser({ plan: account.plan, isAdmin: account.isAdmin }))
      ? "Pro · Unlimited Access"
      : account && typeof account.remaining === "number"
        ? `${account.remaining} free scans left`
        : undefined;

  return (
    <main className="min-h-screen">
      <SiteHeader scanCountLabel={isClient ? scanCountLabel : undefined} />

      {state !== "done" && (
        <>
          <section className="launch-hero" id="scanner">
            <div className="hero-media" aria-hidden="true" />
            <div className="launch-container hero-content">
              <div className="hero-copy-block">
                <p className="launch-eyebrow"><ShieldCheck className="h-4 w-4" /> Free public-page audit</p>
                <h1>See how ready your website is for AI search.</h1>
                <p className="hero-lede">
                  Paste any SaaS landing page and get a 60-second AI visibility audit covering schema, metadata, content clarity, entity signals, and answer-readiness gaps.
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
                    {state === "loading" ? "Scanning" : "Scan My Website"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => document.getElementById("report")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="btn btn-secondary hero-secondary-cta">View Sample Report</button>
                  <button type="button" onClick={() => setShowCompetitors(!showCompetitors)} className="hero-competitor-toggle">
                    <Plus className="h-4 w-4" />
                    {showCompetitors ? "Hide Compare Competitor" : "Compare Competitor"}
                  </button>
                  {showCompetitors && (
                    <div className="hero-competitor-panel">
                      <textarea
                        value={competitorUrls}
                        onChange={(event) => setCompetitorUrls(event.target.value)}
                        placeholder={"https://competitor.com\nhttps://another.com"}
                        rows={3}
                      />
                      <p>Optional. Add up to 3 competitor URLs for automatic benchmarking.</p>
                    </div>
                  )}
                </form>
                <div className="hero-assurance">
                  <span><CheckCircle2 className="h-4 w-4" /> No signup</span>
                  <span><CheckCircle2 className="h-4 w-4" /> No setup required</span>
                  <span><CheckCircle2 className="h-4 w-4" /> 60-second audit</span>
                  <span><CheckCircle2 className="h-4 w-4" /> Free public-page scan</span>
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
                <h2>Useful free scans now. Pro upgrades when you need more volume.</h2>
                <p>The free report includes core scoring and top findings. Pro unlocks full fixes, implementation guidance, and PDF export. Stripe Checkout is currently in sandbox mode for testing.</p>
              </div>
              <div className="pricing-panel">
                <span className="price">$9</span>
                <strong>Pro Report</strong>
                <ul>
                  <li><Lock className="h-4 w-4" /> Full AI search breakdown</li>
                  <li><Lock className="h-4 w-4" /> Competitor/entity comparison</li>
                  <li><Lock className="h-4 w-4" /> Exportable PDF checklist</li>
                </ul>
                <UpgradeButton>Upgrade to Pro</UpgradeButton>
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

      {state === "paywall" && (
        <section className="launch-container paywall-section">
          <div className="pricing-panel">
            <span className="price">$9</span>
            <strong>Daily scan limit reached</strong>
            <p>{errorMsg || "Upgrade with Stripe sandbox to unlock the full Pro report experience for testing."}</p>
            <UpgradeButton>Upgrade to Pro</UpgradeButton>
            <button onClick={() => setState("idle")} className="btn btn-secondary">Back to scanner</button>
          </div>
        </section>
      )}

      <SiteFooter />
    </main>
  );
}
