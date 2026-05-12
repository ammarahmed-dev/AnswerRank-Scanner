"use client";

import { CSSProperties, ReactNode, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import LoadingState from "./LoadingState";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import TopBar from "./TopBar";
import UpgradeButton from "./UpgradeButton";
import ContactForm from "./ContactForm";
import AiSnapshotSection from "./AiSnapshotSection";
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
type ProgressStatus = "started" | "complete" | "skipped" | "error";
type ScanProgressEvent = {
  type: "progress";
  step: number;
  label: string;
  status: ProgressStatus;
};
type ScanResultEvent = { type: "result"; result: ScanResult };
type ScanErrorEvent = { type: "error"; message: string };
type ScanSseEvent = ScanProgressEvent | ScanResultEvent | ScanErrorEvent;
type LoaderProgress = {
  step: number;
  label: string;
  status: ProgressStatus;
};

const CLIENT_STORAGE_KEY = "aeocheck_client_id_v1";
const GUEST_SCAN_STORAGE_KEY = "aeocheck_guest_scans_month";
const STEP_ANIMATION_MS = 140;

const trustStats = [
  { value: "6", label: "Readiness categories", text: "Metadata, headings, schema, clarity, AI readiness, and performance." },
  { value: "3", label: "Priority fixes", text: "The free report focuses attention on the highest-impact work first." },
  { value: "0", label: "Setup required", text: "No signup and no onboarding steps. Paste a public page and scan immediately." },
  { value: "$14", label: "Full Report", text: "One-time payment for a full AI visibility breakdown with schema recommendations and PDF export." },
];

const auditSignals = [
  { icon: FileSearch, title: "Metadata clarity", text: "Title tag, meta description, canonical URL, Open Graph tags, and heading hierarchy. Every signal AI uses to understand a page." },
  { icon: Code2, title: "Structured data", text: "Detects existing JSON-LD schema, flags missing types, and surfaces the highest-impact markup your page is missing." },
  { icon: Sparkles, title: "Answer readiness", text: "Scores how well the page is structured for AI assistants to extract, summarize, and cite its content in answers." },
  { icon: Gauge, title: "Priority scoring", text: "A weighted 0-100 visibility score broken down by category, so you know exactly where to focus first." },
  { icon: FileDown, title: "PDF export", text: "A polished, client-ready audit PDF you can hand off to any team or stakeholder without extra formatting work." },
  { icon: FolderArchive, title: "Saved reports", text: "Every scan is stored in your account so you can revisit past audits and track improvement over time." },
];

const workflow = [
  {
    title: "Paste a public website URL",
    text: "Enter any publicly accessible URL into the scanner. AEOCheck fetches the live page content, metadata, and HTML structure in real time. No browser extension or code installation required.",
  },
  {
    title: "Read every page signal",
    text: "The scanner reads your title tag, meta description, heading hierarchy, schema markup, internal link structure, and content depth. It checks over 20 individual signals that AI engines use to understand and cite pages.",
  },
  {
    title: "Score your AI visibility",
    text: "Every signal is converted into a weighted score across 6 categories: Metadata, Schema, Headings, Content Clarity, Trust Signals, and AI Readiness. Your overall score reflects how well AI engines can understand and cite your page.",
  },
  {
    title: "Act on the highest-impact fixes",
    text: "The report ranks every issue by impact so you know exactly what to fix first. Each issue includes a plain-English explanation of why it matters and a specific recommended fix you can implement immediately.",
  },
];

const faqs = [
  ["Does it work without signup?", "Yes. Paste any public URL and run a free scan instantly. No account required."],
  ["What does the scanner check?", "It checks schema markup, metadata quality, heading structure, content depth, internal links, and how well the page is structured for AI answer extraction."],
  ["Is this the same as a traditional SEO audit?", "No. Traditional SEO audits focus on crawlability, keywords, and backlinks. This scanner focuses on whether answer engines like ChatGPT and Perplexity can accurately understand and cite your page."],
  ["What payment methods do you accept?", "All major credit and debit cards via Stripe. Full Report is one-time, and Pro Monthly is a subscription."],
  ["Do you store my scan data?", "Scans are saved to your account when you're logged in. Free accounts see recent scans; Pro accounts keep full report history."],
];

type HomePageClientProps = {
  heroContent?: ReactNode;
};

export default function Home({ heroContent }: HomePageClientProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [state, setState] = useState<AppState>("idle");
  const [loaderProgress, setLoaderProgress] = useState<LoaderProgress>({ step: 1, label: "Preparing scan", status: "started" });
  const [report, setReport] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [account, setAccount] = useState<{ plan: "guest" | "free" | "pro" | "agency"; isAdmin: boolean; remaining: number | null; unlimited: boolean } | null>({
    plan: "guest",
    isAdmin: false,
    remaining: null,
    unlimited: false,
  });
  const [isClient, setIsClient] = useState(false);
  const [clientId, setClientId] = useState("");
  const [showCompetitors, setShowCompetitors] = useState(false);
  const [competitorUrls, setCompetitorUrls] = useState("");
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistState, setWaitlistState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [waitlistSuccessMessage, setWaitlistSuccessMessage] = useState("You're on the list. We'll email you when Pro Monthly opens.");
  const [waitlistError, setWaitlistError] = useState("");
  const [guestScansLeft, setGuestScansLeft] = useState(1);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalType, setLimitModalType] = useState<"guest" | "free">("guest");
  const [showScanFirstModal, setShowScanFirstModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastRenderedProgressRef = useRef<LoaderProgress>({ step: 1, label: "Preparing scan", status: "started" });
  const progressQueueRef = useRef<ScanProgressEvent[]>([]);
  const pendingResultRef = useRef<ScanResult | null>(null);
  const processingQueueRef = useRef(false);
  const finalStepCompleteRef = useRef(false);
  const currentScanWasGuestRef = useRef(false);
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const getMinimumStepDuration = (step: number, status: ProgressStatus) => {
    if (status === "error" || status === "skipped") return 500;
    if (step === 1 && status === "started") return 450;
    if (step === 2 && status === "started") return 650;
    if (step === 3 && status === "started") return 650;
    if (step === 6 && status === "complete") return 500;
    return 300;
  };
  const progressByStepAndStatus = useMemo(
    () => ({
      "1:started": 10,
      "1:complete": 18,
      "2:started": 25,
      "2:complete": 33,
      "3:started": 40,
      "3:complete": 50,
      "4:started": 58,
      "4:complete": 66,
      "4:skipped": 66,
      "4:error": 66,
      "5:started": 75,
      "5:complete": 84,
      "5:skipped": 84,
      "5:error": 84,
      "6:started": 92,
      "6:complete": 100,
    } as Record<string, number>),
    []
  );
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

    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const raw = localStorage.getItem(GUEST_SCAN_STORAGE_KEY);
    let used = 0;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { month?: string; used?: number };
        if (parsed.month === month) used = Math.max(0, parsed.used ?? 0);
      } catch {
        used = 0;
      }
    }
    setGuestScansLeft(Math.max(0, 1 - used));
  }, []);

  useEffect(() => {
    async function loadAccount() {
      await refreshAccountUsage();
    }
    loadAccount();
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (account && !canRunScan({ plan: account.plan, isAdmin: account.isAdmin }, account.remaining)) {
      if (account.plan === "free") {
        setLimitModalType("free");
        setShowLimitModal(true);
        return;
      }
      return setState("paywall");
    }
    if (account?.plan === "guest" && guestScansLeft <= 0) {
      setLimitModalType("guest");
      setShowLimitModal(true);
      return;
    }
    const trimmed = url.trim();
    if (!trimmed) return inputRef.current?.focus();
    const competitors = competitorUrls
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);

    setState("loading");
    currentScanWasGuestRef.current = account?.plan === "guest";
    const initialProgress: LoaderProgress = { step: 1, label: "Preparing scan", status: "started" };
    setLoaderProgress(initialProgress);
    lastRenderedProgressRef.current = initialProgress;
    progressQueueRef.current = [];
    pendingResultRef.current = null;
    processingQueueRef.current = false;
    finalStepCompleteRef.current = false;
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
        body: JSON.stringify({ url: trimmed, includeAI: true, clientId, competitorUrls: competitors }),
        signal: controller.signal,
      });

      // Non-streaming errors (429, 400, etc.)
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        if (res.status === 429) {
          if (account?.plan === "free") {
            setLimitModalType("free");
            setShowLimitModal(true);
          } else {
            setErrorMsg(data.error ?? "You've used your 3 free scans this month.");
            setState("paywall");
          }
          return;
        }
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        setState("idle");
        setShowErrorModal(true);
        return;
      }

      const maybeFinalizeResult = async () => {
        if (!pendingResultRef.current || !finalStepCompleteRef.current || progressQueueRef.current.length > 0 || processingQueueRef.current) return;

        const result = pendingResultRef.current;
        pendingResultRef.current = null;
        if (!result) return;
        if (result.reportId) {
          sessionStorage.setItem(`aeocheck_report:${result.reportId}`, JSON.stringify(result));
        }
        sessionStorage.setItem(`aeocheck_report:${result.url}`, JSON.stringify(result));
        if (currentScanWasGuestRef.current && typeof window !== "undefined") {
          const now = new Date();
          const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
          const raw = localStorage.getItem(GUEST_SCAN_STORAGE_KEY);
          let used = 0;
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as { month?: string; used?: number };
              if (parsed.month === month) used = Math.max(0, parsed.used ?? 0);
            } catch {
              used = 0;
            }
          }
          const nextUsed = Math.min(1, used + 1);
          localStorage.setItem(GUEST_SCAN_STORAGE_KEY, JSON.stringify({ month, used: nextUsed }));
          setGuestScansLeft(Math.max(0, 1 - nextUsed));
        }
        await refreshAccountUsage();
        setReport(result);
        setState("done");
        router.push(result.reportId ? `/report?id=${result.reportId}` : `/report?url=${encodeURIComponent(result.url)}`);
      };

      const processProgressQueue = async () => {
        if (processingQueueRef.current) return;
        processingQueueRef.current = true;
        try {
          while (progressQueueRef.current.length) {
            const nextProgress = progressQueueRef.current.shift();
            if (!nextProgress) continue;
            const nextLoader: LoaderProgress = {
              step: nextProgress.step,
              label: nextProgress.label,
              status: nextProgress.status,
            };
            lastRenderedProgressRef.current = nextLoader;
            setLoaderProgress(nextLoader);
            if (nextProgress.step === 6 && nextProgress.status === "complete") {
              finalStepCompleteRef.current = true;
            }
            await sleep(getMinimumStepDuration(nextProgress.step, nextProgress.status));
          }
        } finally {
          processingQueueRef.current = false;
          await maybeFinalizeResult();
        }
      };

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
          const eventLines = part
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          const dataLines = eventLines
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.replace(/^data:\s?/, ""));
          if (!dataLines.length) continue;

          const payload = dataLines.join("\n");
          const data = JSON.parse(payload) as ScanSseEvent;

          if (data.type === "error") {
            setErrorMsg(data.message);
            setState("idle");
            setShowErrorModal(true);
            return;
          }

          if (data.type === "progress") {
            progressQueueRef.current.push(data);
            await processProgressQueue();
            continue;
          }

          if (data.type === "result") {
            pendingResultRef.current = data.result;
            await maybeFinalizeResult();
            if (!pendingResultRef.current) break outer;
          }
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof DOMException && err.name === "AbortError"
        ? "The scan took too long. Please try again. External AI or PageSpeed APIs may be slow."
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

  const scrollToScanner = () => {
    document.getElementById("scanner")?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => inputRef.current?.focus(), 250);
  };

  const handleHomepageFullReportCta = () => {
    if (account?.plan === "guest" && guestScansLeft <= 0) {
      setLimitModalType("guest");
      setShowLimitModal(true);
      return;
    }
    setShowScanFirstModal(true);
  };

  const handleProMonthlyPricingCta = async () => {
    const supabase = getSupabaseBrowserClient();
    const token = (await getSafeSupabaseSession(supabase))?.access_token;

    if (!token) {
      window.location.href = "/signup?redirect=pricing&plan=pro";
      return;
    }

    try {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkoutType: "pro_plan",
          returnTo,
        }),
      });

      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout failed.");
      window.location.href = data.url;
    } catch (error) {
      console.error("Pro checkout start failed:", error);
    }
  };

  const closeWaitlistModal = () => {
    setShowWaitlistModal(false);
    setWaitlistState("idle");
    setWaitlistSuccessMessage("You're on the list. We'll email you when Pro Monthly opens.");
    setWaitlistError("");
    setWaitlistEmail("");
  };

  const handleWaitlistSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = waitlistEmail.trim().toLowerCase();
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidEmail) {
      setWaitlistState("error");
      setWaitlistError("Enter a valid email address.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setWaitlistState("error");
      setWaitlistError("Waitlist service is not configured. You can email hello@aeocheck.co to join.");
      return;
    }

    setWaitlistState("loading");
    setWaitlistError("");

    const { error } = await supabase
      .from("waitlist")
      .insert({ email, source: "pro_monthly_waitlist" });

    if (error) {
      const errorRecord = error as {
        code?: string;
        message?: string;
        details?: string;
        hint?: string;
        status?: number;
        statusCode?: number;
      };
      console.error("Waitlist insert error details:", {
        message: errorRecord?.message,
        code: errorRecord?.code,
        details: errorRecord?.details,
        hint: errorRecord?.hint,
        status: errorRecord?.status ?? errorRecord?.statusCode,
        raw: error,
      });

      if (errorRecord.code === "23505") {
        setWaitlistSuccessMessage("You're already on the list.");
        setWaitlistState("success");
        return;
      }
      if (errorRecord.code === "42P01") {
        setWaitlistState("error");
        setWaitlistError("The waitlist table has not been created yet. Please run the Supabase SQL migration.");
        return;
      }
      if (errorRecord.code === "42501" || /row-level security|permission denied/i.test(errorRecord.message ?? "")) {
        setWaitlistState("error");
        setWaitlistError("Waitlist permissions are not configured yet. Please check the Supabase insert policy.");
        return;
      }
      setWaitlistState("error");
      const devDetail = process.env.NODE_ENV !== "production"
        ? ` (Supabase: ${errorRecord.code ?? "unknown"} - ${errorRecord.message || "no message"}${errorRecord.details ? ` | ${errorRecord.details}` : ""})`
        : "";
      setWaitlistError(`Could not join the waitlist right now. Please try again, or email hello@aeocheck.co.${devDetail}`);
      return;
    }

    setWaitlistSuccessMessage("You're on the list. We'll email you when Pro Monthly opens.");
    setWaitlistState("success");
  };

  const scanCountLabel = account && isMasterAdmin({ plan: account.plan, isAdmin: account.isAdmin })
    ? "Master Admin - Unlimited Access"
    : account && (account.unlimited || isProUser({ plan: account.plan, isAdmin: account.isAdmin }))
      ? "Pro - Unlimited Access"
      : account && typeof account.remaining === "number"
        ? `${account.remaining} free scans left this month`
        : account?.plan === "guest" && isClient
          ? `${guestScansLeft} guest preview scan left`
        : undefined;

  return (
    <main className="min-h-screen">
      <Suspense fallback={<div className="top-bar" style={{ minHeight: 37 }} />}>
        <TopBar />
      </Suspense>
      <SiteHeader scanCountLabel={isClient ? scanCountLabel : undefined} />

      {state !== "done" && (
        <>
          <section className="launch-hero" id="scanner">
            <div className="hero-media" aria-hidden="true" />
            <div className="launch-container hero-content">
              <div className="hero-copy-block">
                {heroContent}
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
                  <span><CheckCircle2 className="h-4 w-4" /> Free</span>
                  <span><CheckCircle2 className="h-4 w-4" /> No signup</span>
                  <span><CheckCircle2 className="h-4 w-4" /> 60-second scan</span>
                  <span><CheckCircle2 className="h-4 w-4" /> Works on any public URL</span>
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
                      <div className="visual-bar-label">
                        <span>{label}</span>
                        <span className="visual-bar-score">{[15, 17, 10, 11][index]}/20</span>
                      </div>
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
                  Buyers increasingly discover brands through AI summaries and answer engines like ChatGPT and Perplexity. AEOCheck shows you whether your page gives those systems enough signal to understand, summarize, and cite your business.
                </p>
                <p>Learn how we score your AEO readiness in our <a href="#report">sample report ↓</a></p>
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

          <AiSnapshotSection />

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
            <div className="launch-container pricing-layout">
              <div className="pricing-intro">
                <p className="launch-eyebrow">Pricing</p>
                <h2>Choose the report depth you need.</h2>
                <p>Start with a free preview, then unlock a client-ready report when you need the full breakdown.</p>
              </div>

              <div className="pricing-cards">
                <article className="pricing-panel">
                  <span className="pricing-badge pricing-badge-muted">Free forever</span>
                  <span className="price">$0</span>
                  <h3>Free Preview</h3>
                  <p className="pricing-subline">For testing your AI visibility score.</p>
                  <ul>
                    <li><CheckCircle2 className="h-4 w-4" /> 1 guest preview scan</li>
                    <li><CheckCircle2 className="h-4 w-4" /> 3 free scans per month</li>
                    <li><CheckCircle2 className="h-4 w-4" /> Overall AI Visibility Score</li>
                    <li><CheckCircle2 className="h-4 w-4" /> Basic score breakdown</li>
                    <li><CheckCircle2 className="h-4 w-4" /> Top 3 issues</li>
                    <li><CheckCircle2 className="h-4 w-4" /> Limited report preview</li>
                  </ul>
                  <a href="#scanner" className="btn btn-secondary">Start free scan</a>
                </article>

                <article className="pricing-panel">
                  <span className="pricing-badge pricing-badge-blue">One-time</span>
                  <span className="price">$14 <small>one-time</small></span>
                  <h3>Full Report</h3>
                  <p className="pricing-subline">Best for one website audit.</p>
                  <ul>
                    <li><CheckCircle2 className="h-4 w-4" /> 1 full report</li>
                    <li><CheckCircle2 className="h-4 w-4" /> Full issue breakdown</li>
                    <li><CheckCircle2 className="h-4 w-4" /> Fix recommendations for every issue</li>
                    <li><CheckCircle2 className="h-4 w-4" /> Schema recommendations</li>
                    <li><CheckCircle2 className="h-4 w-4" /> AI Answer Snapshot</li>
                    <li><CheckCircle2 className="h-4 w-4" /> Competitor takeaway</li>
                    <li><CheckCircle2 className="h-4 w-4" /> 3 retests on same URL</li>
                    <li><CheckCircle2 className="h-4 w-4" /> Client-ready PDF report</li>
                  </ul>
                  <button type="button" className="btn btn-secondary" onClick={handleHomepageFullReportCta}>Unlock full report</button>
                </article>

                <article className="pricing-panel pricing-panel-featured">
                  <span className="pricing-badge pricing-badge-purple">Best value</span>
                  <span className="price">$39 <small>/month</small></span>
                  <h3>Pro Monthly</h3>
                  <ul>
                    <li><CheckCircle2 className="h-4 w-4" /> 30 full reports per month</li>
                    <li><CheckCircle2 className="h-4 w-4" /> Saved report history</li>
                    <li><CheckCircle2 className="h-4 w-4" /> Client-ready PDF reports</li>
                    <li><CheckCircle2 className="h-4 w-4" /> Competitor comparisons</li>
                    <li><CheckCircle2 className="h-4 w-4" /> Priority scan access</li>
                    <li><CheckCircle2 className="h-4 w-4" /> Unlimited retests on any URL</li>
                  </ul>
                  <button type="button" className="btn btn-primary" onClick={handleProMonthlyPricingCta}>Start Pro Monthly</button>
                </article>
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
                    <summary><h3>{question}</h3></summary>
                    <p>
                      {answer}
                      {question === "Is this the same as a traditional SEO audit?" && (
                        <>
                          {" "}You can <a href="#scanner">run a free scan here</a> to see the difference.
                        </>
                      )}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          <section className="launch-section contact-section" id="contact">
            <div className="launch-container contact-grid">
              <div className="section-intro contact-intro">
                <p className="launch-eyebrow">Contact</p>
                <h2>Get in touch</h2>
                <p>Have a question about your report, billing, or the scanner? We&apos;ll get back to you within 24 hours.</p>
              </div>
              <ContactForm />
            </div>
          </section>
        </>
      )}

      {state === "loading" && (
        <div className="loading-overlay" role="dialog" aria-modal="true" aria-label="Running AI visibility scan">
          <div className="loading-dialog">
            <LoadingState progress={loaderProgress} progressByStepAndStatus={progressByStepAndStatus} />
          </div>
        </div>
      )}

      {state === "paywall" && (
        <section className="launch-container paywall-section">
          <div className="pricing-panel">
            <span className="price">$14</span>
            <strong>Scan limit reached</strong>
            <p>{errorMsg || "Upgrade to unlock the full report, schema recommendations, implementation checklist, and PDF export."}</p>
            <UpgradeButton checkoutType="pro_plan">Upgrade to Pro</UpgradeButton>
            <button onClick={() => setState("idle")} className="btn btn-secondary">Back to scanner</button>
          </div>
        </section>
      )}

      <SiteFooter />

      {isClient && showLimitModal && createPortal(
        <div className="waitlist-modal-overlay" onClick={() => setShowLimitModal(false)}>
          <div className="waitlist-modal" onClick={(e) => e.stopPropagation()}>
            <div className="waitlist-modal-head">
              <h3>{limitModalType === "guest" ? "You've used your free preview scan" : "You've used your free scans this month"}</h3>
              <p>
                {limitModalType === "guest"
                  ? "Create a free account to get 3 scans per month, then run a new scan and unlock the full report from your results."
                  : "Unlock a full report or upgrade to continue scanning."}
              </p>
            </div>
            <div className="waitlist-modal-form">
              {limitModalType === "guest" ? (
                <>
                  <button type="button" className="btn btn-primary" onClick={() => router.push("/signup?next=/#scanner")}>Create free account</button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowLimitModal(false); document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); }}>View pricing</button>
                  <p className="waitlist-modal-note">Free accounts include 3 preview scans per month.</p>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn-primary" onClick={() => { setShowLimitModal(false); document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); }}>View plans</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowLimitModal(false)}>Cancel</button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {isClient && showScanFirstModal && createPortal(
        <div className="waitlist-modal-overlay" onClick={() => setShowScanFirstModal(false)}>
          <div className="waitlist-modal" onClick={(e) => e.stopPropagation()}>
            <div className="waitlist-modal-head">
              <h3>Run a scan first</h3>
              <p>Full Report unlocks are attached to a specific scan. Run a website scan first, then unlock the full report from your results.</p>
            </div>
            <div className="waitlist-modal-form">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowScanFirstModal(false);
                  scrollToScanner();
                }}
              >
                Scan My Website
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowScanFirstModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {isClient && showWaitlistModal && createPortal(
        <div className="waitlist-modal-overlay" onClick={closeWaitlistModal}>
          <div className="waitlist-modal" onClick={(e) => e.stopPropagation()}>
            <div className="waitlist-modal-head">
              <h3>Join Pro waitlist</h3>
              <p>Get notified when monthly plans and priority scan features are available.</p>
            </div>

            {waitlistState === "success" ? (
              <div className="waitlist-modal-success">
                <CheckCircle2 className="h-5 w-5" />
                <p>{waitlistSuccessMessage}</p>
              </div>
            ) : (
              <form className="waitlist-modal-form" onSubmit={handleWaitlistSubmit}>
                <label htmlFor="waitlist-email">Email</label>
                <input
                  id="waitlist-email"
                  type="email"
                  value={waitlistEmail}
                  onChange={(event) => setWaitlistEmail(event.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  disabled={waitlistState === "loading"}
                  required
                />
                <input type="hidden" name="source" value="pro_monthly_waitlist" />
                {waitlistState === "error" && (
                  <p className="waitlist-modal-error">
                    {waitlistError}{" "}
                    <a href={`mailto:hello@aeocheck.co?subject=Pro%20Monthly%20Waitlist&body=Please%20add%20${encodeURIComponent(waitlistEmail || "my email")}%20to%20the%20Pro%20Monthly%20waitlist.`}>Email us instead</a>.
                  </p>
                )}
                <button type="submit" className="btn btn-primary" disabled={waitlistState === "loading"}>
                  {waitlistState === "loading" ? "Joining..." : "Join waitlist"}
                </button>
              </form>
            )}

            <div className="waitlist-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={closeWaitlistModal}>
                {waitlistState === "success" ? "Close" : "Cancel"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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










