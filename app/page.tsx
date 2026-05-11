"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  CheckCircle2,
  XCircle,
  Code2,
  FileDown,
  FileSearch,
  FolderArchive,
  Gauge,
  Globe,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";

type AppState = "idle" | "loading" | "done" | "error" | "paywall";

const CLIENT_STORAGE_KEY = "answerrank_client_id_v1";

const trustStats = [
  { value: "6", label: "Readiness categories", text: "Metadata, headings, schema, clarity, AI readiness, and performance." },
  { value: "3", label: "Priority fixes", text: "The free report focuses attention on the highest-impact work first." },
  { value: "0", label: "Setup required", text: "No signup and no onboarding steps. Paste a public page and scan immediately." },
  { value: "$9", label: "Pro report", text: "One-time payment for a full AI visibility breakdown with schema recommendations and PDF export." },
];

const auditSignals = [
  { icon: FileSearch, title: "Metadata clarity", text: "Title tag, meta description, canonical URL, Open Graph tags, and heading hierarchy — every signal AI uses to understand a page." },
  { icon: Code2, title: "Structured data", text: "Detects existing JSON-LD schema, flags missing types, and surfaces the highest-impact markup your page is missing." },
  { icon: Sparkles, title: "Answer readiness", text: "Scores how well the page is structured for AI assistants to extract, summarize, and cite its content in answers." },
  { icon: Gauge, title: "Priority scoring", text: "A weighted 0–100 visibility score broken down by category — so you know exactly where to focus first." },
  { icon: FileDown, title: "PDF export", text: "A polished, client-ready audit PDF you can hand off to any team or stakeholder without extra formatting work." },
  { icon: FolderArchive, title: "Saved reports", text: "Every scan is stored in your account so you can revisit past audits and track improvement over time." },
];

const workflow = [
  { title: "Paste a public website URL", text: "Paste any public URL and the scanner fetches the page content, metadata, and structure signals instantly." },
  { title: "Read every page signal", text: "It reads metadata, headings, schema, internal links, and content depth across the full page." },
  { title: "Score your AI visibility", text: "Every signal converts into a weighted 0–100 score with a plain-English verdict for each category." },
  { title: "Act on the highest-impact fixes", text: "Copy the recommendations, implement schema fixes, or unlock the full Pro report for detailed guidance." },
];

const faqs = [
  ["Does it work without signup?", "Yes. Paste any public URL and run a free scan instantly — no account required."],
  ["What does the scanner check?", "It checks schema markup, metadata quality, heading structure, content depth, internal links, and how well the page is structured for AI answer extraction."],
  ["Is this the same as a traditional SEO audit?", "No. Traditional SEO audits focus on crawlability, keywords, and backlinks. This scanner focuses on whether answer engines like ChatGPT and Perplexity can accurately understand and cite your page."],
  ["What payment methods do you accept?", "All major credit and debit cards via Stripe. Payment is one-time — no subscriptions or recurring charges."],
  ["Do you store my scan data?", "Scans are saved to your account when you're logged in. Free accounts see recent scans; Pro accounts keep full report history."],
];

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [state, setState] = useState<AppState>("idle");
  const [loadingStep, setLoadingStep] = useState(0);
  const [report, setReport] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [account, setAccount] = useState<{ plan: "guest" | "free" | "pro" | "agency"; isAdmin: boolean; remaining: number | null; unlimited: boolean } | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [clientId, setClientId] = useState("");
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [competitorUrls, setCompetitorUrls] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const refreshAccountUsage = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const token = (await getSafeSupabaseSession(supabase))?.access_token;
    if (!token) {
      setAccount({ plan: "guest", isAdmin: false, remaining: null, unlimited: false });
      return;
    }
    try {
      const res = await fetch("/api/account", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { profile: { plan: "guest" | "free" | "pro" | "agency"; isAdmin?: boolean }; usage: { remaining: number | null; unlimited: boolean } };
      setAccount({
        plan: data.profile.plan,
        isAdmin: Boolean(data.profile.isAdmin),
        remaining: data.usage.remaining,
        unlimited: data.usage.unlimited,
      });
    } catch {
      return;
    }
  };

  useEffect(() => {
    setIsClient(true);
    const storedClientId = localStorage.getItem(CLIENT_STORAGE_KEY);
    const nextClientId = storedClientId || crypto.randomUUID();
    localStorage.setItem(CLIENT_STORAGE_KEY, nextClientId);
    setClientId(nextClientId);
  }, []);

  useEffect(() => {
    async function loadAccount() {
      await refreshAccountUsage();
    }
    loadAccount();
  }, []);

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
    setLoadingStep(0);
    setReport(null);
    setErrorMsg("");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
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

      // Non-streaming errors (429, 400, etc.)
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        if (res.status === 429) {
          setErrorMsg(data.error ?? "Free scan limit reached for today.");
          setState("paywall");
          return;
        }
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setState("idle");
        setShowErrorModal(true);
        return;
      }

      // Read SSE stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;

          const data = JSON.parse(line.slice(6)) as { step?: number; result?: ScanResult; error?: string };

          if (data.error) {
            setErrorMsg(data.error);
            setState("idle");
            setShowErrorModal(true);
            return;
          }

          if (typeof data.step === "number") {
            setLoadingStep(data.step);
          }

          if (data.result) {
            const result = data.result;
            if (competitors.length) result.competitorUrls = competitors;
            if (result.reportId) {
              sessionStorage.setItem(`answerrank_report:${result.reportId}`, JSON.stringify(result));
            }
            sessionStorage.setItem(`answerrank_report:${result.url}`, JSON.stringify(result));
            await refreshAccountUsage();
            setReport(result);
            setState("done");
            router.push(result.reportId ? `/report?id=${result.reportId}` : `/report?url=${encodeURIComponent(result.url)}`);
            break outer;
          }
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof DOMException && err.name === "AbortError"
        ? "The scan took too long. Please try again — external AI or PageSpeed APIs may be slow."
        : "Network error. Please check your connection and try again.");
      setState("idle");
      setShowErrorModal(true);
    } finally {
      clearTimeout(timeout);
    }
  };

  const handleReset = () => {
    setState("idle");
    setReport(null);
    setErrorMsg("");
    setUrl("");
    setShowErrorModal(false);
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
                <p className="launch-eyebrow mb-4 ml-px"><ShieldCheck className="h-4 w-4" /> Free · No signup required</p>
                <h1>See how ready your website is for AI search.</h1>
                <p className="hero-lede">
                  Paste any URL and get a scored AI visibility report in under 60 seconds — with every fix ranked by impact.
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
                  <a href="/report?id=bdb3a316-6889-4fa5-9045-cf317938597e" className="btn btn-secondary hero-secondary-cta">View Sample Report</a>
                  <button type="button" onClick={() => setShowCompetitors(!showCompetitors)} className="hero-competitor-toggle">
                    <Plus className="h-4 w-4" />
                    {showCompetitors ? "Hide Competitor Compare" : "Compare a Competitor"}
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
                  <span><CheckCircle2 className="h-4 w-4" /> No setup</span>
                  <span><CheckCircle2 className="h-4 w-4" /> 60-second scan</span>
                  <span><CheckCircle2 className="h-4 w-4" /> Always free for public pages</span>
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


          <section className="image-story-section">
            <div className="launch-container image-story-grid">
              <div className="answer-map-visual" aria-label="AI visibility signal map">
                <svg aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}>
                  <line x1="50%" y1="44%" x2="20%" y2="20%" stroke="rgba(6,182,212,0.3)" strokeWidth="1" />
                  <line x1="50%" y1="44%" x2="76%" y2="22%" stroke="rgba(6,182,212,0.3)" strokeWidth="1" />
                  <line x1="50%" y1="44%" x2="18%" y2="66%" stroke="rgba(6,182,212,0.3)" strokeWidth="1" />
                  <line x1="50%" y1="44%" x2="74%" y2="66%" stroke="rgba(6,182,212,0.3)" strokeWidth="1" />
                </svg>
                <div className="answer-node answer-node-primary">
                  <Search className="h-5 w-5" />
                  <strong>AI Search</strong>
                </div>
                <div className="signal-orbit">
                  <span style={{ "--x": "16%", "--y": "16%" } as CSSProperties}>Metadata</span>
                  <span style={{ "--x": "70%", "--y": "18%" } as CSSProperties}>Schema</span>
                  <span style={{ "--x": "10%", "--y": "60%" } as CSSProperties}>Performance</span>
                  <span style={{ "--x": "62%", "--y": "60%" } as CSSProperties}>Trust Signals</span>
                </div>
                <div className="answer-card-preview">
                  <p>Readiness score</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                    <strong style={{ margin: 0 }}>83/100</strong>
                    <span style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e", borderRadius: "999px", padding: "2px 8px", fontSize: "0.75rem", fontWeight: 700 }}>Strong</span>
                  </div>
                  <small>3 priority fixes identified</small>
                </div>
              </div>
              <div className="story-content">
                <p className="launch-eyebrow">Why it matters</p>
                <h2>Search is becoming answer-first. Your site needs machine-readable proof.</h2>
                <p>
                  Buyers increasingly discover brands through AI summaries and answer engines like ChatGPT and Perplexity. AnswerRank shows you whether your page gives those systems enough signal to understand, summarize, and cite your business.
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
                <p className="launch-eyebrow">Pricing</p>
                <h2>Free scans with real findings. Pro unlocks the full report.</h2>
                <p>The free report includes your overall score and top issues. Pro unlocks every fix, the full implementation roadmap, and PDF export. One payment, permanent access.</p>
              </div>
              <div className="pricing-panel">
                <span className="price">$9</span>
                <strong>Pro Report</strong>
                <ul>
                  <li><CheckCircle2 className="h-4 w-4" /> Every issue, fix, and recommendation</li>
                  <li><CheckCircle2 className="h-4 w-4" /> Step-by-step implementation roadmap</li>
                  <li><CheckCircle2 className="h-4 w-4" /> Branded PDF to share with your team</li>
                </ul>
                <UpgradeButton>Upgrade to Pro</UpgradeButton>
              </div>
            </div>
          </section>

          <section className="faq-section" id="faq">
            <div className="launch-container faq-grid">
              <div className="section-intro">
                <p className="launch-eyebrow">FAQ</p>
                <h2>Common questions about the scan and report.</h2>
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
            <p>{errorMsg || "Upgrade to unlock the full report, schema recommendations, implementation checklist, and PDF export."}</p>
            <UpgradeButton>Upgrade to Pro</UpgradeButton>
            <button onClick={() => setState("idle")} className="btn btn-secondary">Back to scanner</button>
          </div>
        </section>
      )}

      <SiteFooter />

      {isClient && showErrorModal && createPortal(
        <div className="error-modal-overlay" onClick={() => setShowErrorModal(false)} style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="error-modal" onClick={(e) => e.stopPropagation()}>
            <div className="error-modal-header">
              <div className="error-icon-wrapper">
                <XCircle className="h-7 w-7" />
              </div>
              <div className="error-header-text">
                <h3>Couldn&apos;t scan this page</h3>
                <p>The scanner couldn&apos;t access this URL</p>
              </div>
            </div>
            <div className="error-modal-body">
              <div className="error-detail">
                <p className="error-main-message">{errorMsg || "This website blocked the scanner or the content is not publicly accessible."}</p>
              </div>
              <div className="error-suggestions">
                <p className="error-suggestions-title">Try these instead</p>
                <ul className="error-suggestions-list">
                  <li>Check the URL is correct and the page is public</li>
                  <li>Try a different page from the same website</li>
                  <li>Make sure the page doesn&apos;t require a login</li>
                </ul>
              </div>
            </div>
            <div className="error-modal-footer">
              <button className="error-modal-button error-modal-secondary" onClick={() => setShowErrorModal(false)}>Cancel</button>
              <button className="error-modal-button error-modal-primary" onClick={() => { setShowErrorModal(false); setUrl(""); setTimeout(() => inputRef.current?.focus(), 50); }}>Try a Different URL</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </main>
  );
}
