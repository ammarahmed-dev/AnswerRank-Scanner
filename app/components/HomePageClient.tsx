"use client";

import { CSSProperties, ReactNode, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import type { BlogPostMeta } from "@/lib/blog";
import LoadingState from "./LoadingState";
import SiteHeader from "./SiteHeader";
import TopBar from "./TopBar";
import UpgradeButton from "./UpgradeButton";
import ContactForm from "./ContactForm";
import AiSnapshotSection from "./AiSnapshotSection";
import WhoUsesSection from "./WhoUsesSection";

// Code-split below-fold and decoration-only components out of the initial bundle
const AnimatedProductDemo = dynamic(() => import("./AnimatedProductDemo"));
const TestimonialsSection = dynamic(
  () => import("./TestimonialsSection"),
  {
    ssr: false,
    loading: () => <section className="testimonials-section" style={{ minHeight: 320 }} />,
  }
);
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ScanResult } from "@/types/index";
import { useRouter, useSearchParams } from "next/navigation";
import { canRunScan, isProUser } from "@/lib/access";
import { useAuth } from "@/app/context/AuthContext";
import {
  Globe,
  ArrowRight,
  CaretRight,
  MagnifyingGlass,
  CheckCircle,
  Sparkle,
  Lock,
  XCircle,
  Code,
  FileArrowDown,
  FileMagnifyingGlass,
  FileArchive,
  Gauge,
} from "@phosphor-icons/react";

type AppState = "idle" | "loading" | "done" | "error" | "paywall";
type ScannerTab = "scan" | "compare" | "monitor" | "audit";
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

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

const CLIENT_STORAGE_KEY = "aeocheck_client_id_v1";
const GUEST_SCAN_STORAGE_KEY = "aeocheck_guest_scans_month";
const STEP_ANIMATION_MS = 140;

const trustStats = [
  { value: "5,700+", label: "Scans run", text: "Over 5,700 websites have been scanned for AEO and AI search readiness using AEOCheck." },
  { value: "25", label: "Checks per scan", text: "Every scan covers 25 signals across schema, metadata, content clarity, trust signals, and AI readiness." },
  { value: "60s", label: "Scan time", text: "Paste a URL and get a scored AI readiness report in under 60 seconds. No installation needed." },
  { value: "$0", label: "To start", text: "Run a free scan without creating an account. No credit card, no trial period." },
];

const auditSignals = [
  { icon: FileMagnifyingGlass, title: "Metadata clarity", text: "Checks your title, description, Open Graph tags, and heading structure. These are the signals AI uses to understand a page." },
  { icon: Code, title: "Structured data", text: "Finds existing JSON-LD schema and flags missing types. Shows you the markup that will have the biggest impact on AI visibility." },
  { icon: Sparkle, title: "Answer readiness", text: "Scores how well your page is set up for AI tools to read, summarize, and cite its content in answers." },
  { icon: Gauge, title: "Priority scoring", text: "A weighted 0-100 score broken down by category. You know exactly where to focus first." },
  { icon: FileArrowDown, title: "Content clarity", text: "Checks whether your page clearly explains who you are, what you offer, who you help, and why AI systems should trust the answer." },
  { icon: FileArchive, title: "Trust signals", text: "Checks for entity, business, contact, and credibility signals that help AI systems understand and cite your brand." },
];

const workflow = [
  {
    title: "Paste a public website URL",
    text: "Enter any public URL. AEOCheck fetches the live page content, metadata, and HTML structure in real time. No browser extension or installation needed.",
  },
  {
    title: "Read every page signal",
    text: "The scanner reads your metadata, schema markup, and content structure. It checks over 20 signals that AI engines use to cite your page.",
  },
  {
    title: "Score your AI visibility",
    text: "Each signal gets a score across metadata, schema, headings, clarity, trust, and performance. Your total AI visibility score shows how well answer engines can read, understand, and cite your page.",
  },
  {
    title: "Act on the highest-impact fixes",
    text: "The report ranks every issue by impact so you know what to fix first. Each issue includes a plain-English explanation and a specific fix you can use right away.",
  },
];

const faqs = [
  ["Is it actually free?", "Yes. You can scan any public URL without creating an account and see your AEO score plus the top issues found. A free account gives you 3 scans per month. No credit card required at any point."],
  ["What is AEO and why does it matter?", "AEO (Answer Engine Optimization) is the practice of making your website understandable and citable by AI tools like ChatGPT, Perplexity, and Google AI Overviews. As more people get answers directly from AI instead of clicking search results, being a cited source is becoming as important as ranking on page one."],
  ["How is this different from Google Search Console?", "Google Search Console shows how your site performs in traditional Google search - rankings, clicks, and crawl errors. AEOCheck checks whether AI answer engines can read, understand, and cite your content. A site can rank well on Google and still be invisible to AI search. Different problem, different fixes."],
  ["Does it work without signup?", "Yes. Paste any public URL and run a free scan instantly. No account required."],
  ["What does the scanner check?", "It checks over 25 AEO and AI search readiness signals, including schema, metadata, headings, content clarity, and answer extraction structure."],
  ["Is this the same as a traditional SEO audit?", "No. Traditional SEO audits focus on keywords and backlinks. This scanner checks whether answer engines like ChatGPT and Perplexity can understand and cite your page."],
  ["Do you store my scan data?", "Scans are saved to your account when you're logged in. Free accounts see recent scans; Pro accounts keep full report history."],
];


type HomePageClientProps = {
  heroContent?: ReactNode;
  latestPosts: BlogPostMeta[];
};

function HomeInner({ heroContent, latestPosts }: HomePageClientProps) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [state, setState] = useState<AppState>("idle");
  const [loaderProgress, setLoaderProgress] = useState<LoaderProgress>({ step: 1, label: "Preparing scan", status: "started" });
  const [report, setReport] = useState<ScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const { plan, isAdmin, remaining, unlimited, loading: authLoading, refresh: authRefresh, portalUrl } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [clientId, setClientId] = useState("");
  const [scannerTab, setScannerTab] = useState<ScannerTab>("scan");
  const [compareUrl, setCompareUrl] = useState("");
  const [compareCompetitorUrl, setCompareCompetitorUrl] = useState("");
  const [compareState, setCompareState] = useState<"idle" | "loading" | "error">("idle");
  const [compareError, setCompareError] = useState("");
  const [compareSimStep, setCompareSimStep] = useState(0);
  const [auditDomain, setAuditDomain] = useState("");
  const [auditState, setAuditState] = useState<"idle" | "loading" | "error">("idle");
  const [auditError, setAuditError] = useState("");
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistState, setWaitlistState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [waitlistSuccessMessage, setWaitlistSuccessMessage] = useState("You're on the list. We'll email you when Pro Monthly opens.");
  const [waitlistError, setWaitlistError] = useState("");
  const [guestScansLeft, setGuestScansLeft] = useState(1);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalType, setLimitModalType] = useState<"guest" | "free" | "competitor">("guest");
  const [showScanFirstModal, setShowScanFirstModal] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0);
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


  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authLoading && !canRunScan({ plan, isAdmin }, remaining)) {
      if (plan === "free") {
        setLimitModalType("free");
        setShowLimitModal(true);
        return;
      }
      return setState("paywall");
    }
    if (plan === "guest" && guestScansLeft <= 0) {
      setLimitModalType("guest");
      setShowLimitModal(true);
      return;
    }
    const normalizedUrl = normalizeUrl(url || inputRef.current?.value || "");
    if (!normalizedUrl) return inputRef.current?.focus();
    if (normalizedUrl !== url) setUrl(normalizedUrl);

    setState("loading");
    document.body.style.overflow = "hidden";
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    currentScanWasGuestRef.current = plan === "guest";
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
        body: JSON.stringify({ url: normalizedUrl, includeAI: true, clientId }),
        signal: controller.signal,
      });

      // Non-streaming errors (429, 400, etc.)
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        if (res.status === 429) {
          if (plan === "free") {
            setLimitModalType("free");
            setShowLimitModal(true);
          } else {
            setErrorMsg(data.error ?? "You've used your 3 free scans this month.");
            document.body.style.overflow = "";
            setState("paywall");
          }
          return;
        }
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        document.body.style.overflow = "";
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
        await authRefresh();
        setReport(result);
        document.body.style.overflow = "";
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
            document.body.style.overflow = "";
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
      document.body.style.overflow = "";
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

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = normalizeUrl(auditDomain);
    if (!raw) return;
    if (raw !== auditDomain) setAuditDomain(raw);

    let domain = raw;
    try {
      const parsed = new URL(raw);
      if (!parsed.hostname || parsed.hostname.includes(" ")) {
        setAuditError("Please enter a valid website URL.");
        setAuditState("error");
        return;
      }
      domain = parsed.href;
    } catch {
      setAuditError("Please enter a valid website URL.");
      setAuditState("error");
      return;
    }

    setAuditState("loading");
    setAuditError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const token = (await getSafeSupabaseSession(supabase))?.access_token;
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ domain }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setAuditError(data.error ?? "Could not start audit. Please try again.");
        setAuditState("error");
        return;
      }
      router.push(`/audit/${data.id}`);
    } catch {
      setAuditError("Network error. Please check your connection and try again.");
      setAuditState("error");
    }
  };

  const handleCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    const a = normalizeUrl(compareUrl);
    const b = normalizeUrl(compareCompetitorUrl);
    if (!a || !b) {
      setCompareError("Please enter both URLs before running a comparison.");
      return;
    }
    if (a !== compareUrl) setCompareUrl(a);
    if (b !== compareCompetitorUrl) setCompareCompetitorUrl(b);
    sessionStorage.removeItem("aeocheck_compare_result");
    setCompareSimStep(0);
    setCompareState("loading");
    setCompareError("");
    document.body.style.overflow = "hidden";

    // Simulated stage progress - advances max to stage 4, never completes
    let simStep = 0;
    const stepTimers: ReturnType<typeof setTimeout>[] = [];
    const durations = [2200, 4800, 7600, 10800, 14400];
    for (const ms of durations) {
      stepTimers.push(setTimeout(() => {
        if (simStep < 4) {
          simStep += 1;
          setCompareSimStep(simStep);
        }
      }, ms));
    }

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryUrl: a, competitorUrl: b }),
      });
      const payload = (await res.json()) as Record<string, unknown>;
      stepTimers.forEach(clearTimeout);
      if (!res.ok) {
        document.body.style.overflow = "";
        setCompareError((payload.error as string) || "Comparison failed. Please try different URLs.");
        setCompareState("error");
        setCompareSimStep(0);
        return;
      }
      document.body.style.overflow = "";
      sessionStorage.setItem("aeocheck_compare_result", JSON.stringify(payload));
      router.push("/compare-report");
    } catch {
      stepTimers.forEach(clearTimeout);
      document.body.style.overflow = "";
      setCompareError("Could not reach the comparison service. Please try again.");
      setCompareState("error");
      setCompareSimStep(0);
    }
  };

  const scrollToScanner = () => {
    document.getElementById("scanner")?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => inputRef.current?.focus(), 250);
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

  const scanCountLabel = (() => {
    if (!isClient || authLoading) return undefined;
    if (isAdmin) return "Master Admin - Unlimited Access";
    if (unlimited) return "Pro - Unlimited Access";
    if (typeof remaining === "number") return `${remaining} free scans left this month`;
    if (plan === "guest") return `${guestScansLeft} guest preview scan left`;
    return undefined;
  })();

  const hasProAccess = isClient && !authLoading && isProUser({ plan, isAdmin });
  const auditPageLimit = isAdmin ? 500 : plan === "agency" ? 500 : plan === "pro" ? 100 : plan === "onetime" ? 50 : plan === "free" ? 5 : 0;

  return (
    <main className="min-h-screen">
      <Suspense fallback={null}>
        <SearchParamsTabSync onTab={setScannerTab} />
      </Suspense>
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

                <div className="scanner-card" id="scanner">
                  <div className="scanner-tabs" role="tablist">
                    <button role="tab" type="button" aria-selected={scannerTab === "scan"} className={`scanner-tab${scannerTab === "scan" ? " active" : ""}`} onClick={() => setScannerTab("scan")}>
                      Scan
                    </button>
                    <button role="tab" type="button" aria-selected={scannerTab === "compare"} className={`scanner-tab${scannerTab === "compare" ? " active" : ""}`} onClick={() => setScannerTab("compare")}>
                      Compare
                    </button>
                    <button role="tab" type="button" aria-selected={scannerTab === "monitor"} className={`scanner-tab${scannerTab === "monitor" ? " active" : ""}`} onClick={() => setScannerTab("monitor")}>
                      Monitor
                    </button>
                    <button role="tab" type="button" aria-selected={scannerTab === "audit"} className={`scanner-tab${scannerTab === "audit" ? " active" : ""}`} onClick={() => setScannerTab("audit")}>
                      Audit
                    </button>
                  </div>

                  {scannerTab === "scan" && (
                    <form onSubmit={handleScan} className="scanner-tab-panel" aria-label="Scan a website">
                      <div className="scanner-input-row">
                        <div className="hero-input-wrap">
                          <Globe weight="duotone" className="h-5 w-5" />
                          <input
                            ref={inputRef}
                            type="text"
                            aria-label="Website URL to scan"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://yourwebsite.com"
                            disabled={state === "loading"}
                          />
                        </div>
                        <button type="submit" disabled={state === "loading"} className="btn btn-primary scanner-submit-btn">
                          {state === "loading" ? "Scanning..." : "Scan My Website"}
                          <ArrowRight weight="bold" className="h-4 w-4" />
                        </button>
                      </div>
                      <a href="/sample-report" className="scanner-sample-link">View a sample full report</a>
                    </form>
                  )}

                  {scannerTab === "compare" && (
                    <form onSubmit={handleCompare} className="scanner-tab-panel" aria-label="Compare two websites">
                      <div className="compare-form">
                        <label className="compare-input">
                          <span>Your website URL</span>
                          <input
                            type="url"
                            aria-label="Your website URL"
                            placeholder="https://yourwebsite.com"
                            value={compareUrl}
                            onChange={(e) => setCompareUrl(e.target.value)}
                            disabled={compareState === "loading"}
                          />
                        </label>
                        <label className="compare-input">
                          <span>Competitor URL</span>
                          <input
                            type="url"
                            aria-label="Competitor website URL"
                            placeholder="https://competitor.com"
                            value={compareCompetitorUrl}
                            onChange={(e) => setCompareCompetitorUrl(e.target.value)}
                            disabled={compareState === "loading"}
                          />
                        </label>
                        <button
                          type="submit"
                          className="btn btn-primary compare-submit"
                          disabled={compareState === "loading" || !compareUrl.trim() || !compareCompetitorUrl.trim()}
                        >
                          {compareState === "loading" ? "Comparing..." : "Run Comparison"}
                        </button>
                      </div>
                      {compareError && <p className="compare-error">{compareError}</p>}
                    </form>
                  )}

                  {scannerTab === "monitor" && (
                    hasProAccess
                      ? (
                        <div className="scanner-tab-panel">
                          <div className="monitor-tab-pro" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: "200px", padding: "32px" }}>
                            <p>Track your AEO score over time with weekly or monthly rescans and trend charts.</p>
                            <Link href="/monitor" className="btn btn-primary">Open Monitor Dashboard</Link>
                          </div>
                        </div>
                      )
                      : (
                        <div className="scanner-tab-panel locked-teaser">
                          <div className="locked-teaser-inner">
                            <UpgradeButton plan="pro" className="btn btn-primary locked-teaser-cta">
                              Upgrade to unlock
                            </UpgradeButton>
                          </div>
                        </div>
                      )
                  )}

                  {scannerTab === "audit" && (
                    <form onSubmit={handleAudit} className="scanner-tab-panel" id="audit" aria-label="Audit a website">
                      <div style={{ marginBottom: 12 }}>
                        <h3 style={{ fontSize: "1.05rem", fontWeight: 800, marginBottom: 6 }}>Multi-page AEO audit</h3>
                        <p className="scanner-sample-link" style={{ marginBottom: 0 }}>Scan every important page and get a site-wide AEO score.</p>
                      </div>
                      <div className="scanner-input-row">
                        <div className="hero-input-wrap">
                          <Globe weight="duotone" className="h-5 w-5" />
                          <input
                            type="text"
                            aria-label="Domain to audit"
                            value={auditDomain}
                            onChange={(e) => setAuditDomain(e.target.value)}
                            placeholder="https://yourwebsite.com"
                            disabled={auditState === "loading"}
                          />
                        </div>
                        <button type="submit" disabled={auditState === "loading" || !auditDomain.trim()} className="btn btn-primary scanner-submit-btn">
                          {auditState === "loading" ? "Starting..." : "Start Audit"}
                          <ArrowRight weight="bold" className="h-4 w-4" />
                        </button>
                      </div>
                      {auditError && <p className="compare-error">{auditError}</p>}
                      {plan === "guest"
                        ? <p className="scanner-sample-link"><a href="/signup">Sign up free</a> to start auditing.</p>
                        : <p className="scanner-sample-link">Scans up to {auditPageLimit} pages.</p>
                      }
                    </form>
                  )}
                </div>

                <div className="hero-assurance">
                  <span><CheckCircle weight="fill" className="h-4 w-4" /> Free</span>
                  <span><CheckCircle weight="fill" className="h-4 w-4" /> No signup</span>
                  <span><CheckCircle weight="fill" className="h-4 w-4" /> 60-second scan</span>
                  <span><CheckCircle weight="fill" className="h-4 w-4" /> Works on any public URL</span>
                </div>
                {isClient && <p className="hero-trust-claim">25-point AEO checklist based on how ChatGPT, Perplexity, and Claude index web content</p>}
                {isClient && <p className="hero-last-updated">Updated May 2026</p>}
              </div>

              <AnimatedProductDemo />
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

          <section className="what-we-do-section launch-section muted-section">
            <div className="launch-container">
              <div className="section-intro">
                <p className="launch-eyebrow">What we do</p>
                <h2>We tell you exactly how AI engines see your website.</h2>
              </div>
              <div className="what-we-do-grid">
                <div className="what-we-do-card">
                  <h3>AI visibility scanning</h3>
                  <p>Paste any public URL. AEOCheck scans the live page for AI search readiness signals and returns a scored AEO report in under 60 seconds.</p>
                </div>
                <div className="what-we-do-card">
                  <h3>25-point readiness checks</h3>
                  <p>Every scan covers 25 checks across metadata, schema, headings, and more. You get a full picture in one place.</p>
                </div>
                <div className="what-we-do-card">
                  <h3>Actionable recommendations</h3>
                  <p>Each issue comes with a plain-English explanation and a specific fix you can use right away. Issues are ranked by impact so you always know what to tackle first.</p>
                </div>
              </div>
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
                  <MagnifyingGlass weight="duotone" className="h-5 w-5" />
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
                  More buyers now discover brands through AI tools like ChatGPT, Perplexity, and Google AI results. AEOCheck shows whether your page gives those systems enough context to understand, summarize, and cite your business.
                </p>
                <p>Learn how we score your AEO readiness in our <a href="/sample-report" style={{ color: "var(--color-primary)", fontWeight: 700, textDecoration: "none" }}>sample report.</a></p>
                <div className="story-checks">
                  <span><CheckCircle weight="fill" className="h-4 w-4" /> Brand and entity clarity</span>
                  <span><CheckCircle weight="fill" className="h-4 w-4" /> Structured data coverage</span>
                  <span><CheckCircle weight="fill" className="h-4 w-4" /> Recommended answer blocks</span>
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

          <WhoUsesSection />

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
                    <Icon weight="duotone" className="h-5 w-5" />
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="launch-section featured-guides-section" aria-labelledby="featured-guides-heading">
            <div className="launch-container">
              <div className="section-intro">
                <p className="launch-eyebrow">AEO Guides</p>
                <h2 id="featured-guides-heading">Learn how AI search visibility works</h2>
                <p className="featured-guides-description">
                  Practical guides on AEO, AI search readiness, ChatGPT visibility, schema, and website optimization for answer engines.
                </p>
              </div>

              <div className="featured-guides-grid">
                {latestPosts.map((post) => (
                  <Link key={post.slug} href={`/blog/${post.slug}`} className="featured-guide-card">
                    <div style={{ height: 160, overflow: "hidden", borderRadius: 8, marginBottom: 12, flexShrink: 0 }}>
                      {post.coverImage ? (
                        <Image
                          src={post.coverImage}
                          alt={post.coverImageAlt ?? post.title}
                          width={480}
                          height={160}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", background: "rgba(0, 240, 180, 0.08)", border: "1px solid rgba(0, 240, 180, 0.15)" }} />
                      )}
                    </div>
                    <span className="featured-guide-pill">{post.tags[0] ?? "Guide"}</span>
                    <h3>{post.title}</h3>
                    <p>{post.description}</p>
                    <span className="featured-guide-link">Read guide</span>
                  </Link>
                ))}
              </div>

              <div className="featured-guides-cta-row">
                <a href="/blog" className="btn btn-secondary featured-guides-cta-link">Read more AI search guides</a>
              </div>
            </div>
          </section>

          <TestimonialsSection />

          <section className="pricing-section" id="pricing">
            <div className="launch-container pricing-layout">
              <div className="pricing-intro">
                <p className="launch-eyebrow">Pricing</p>
                <h2>Simple pricing for every team size.</h2>
                <p>Start free, upgrade when you need deeper insights and full site coverage.</p>
                <p className="pricing-sample-link">Not sure what to expect? <a href="/sample-report">View a sample full report.</a></p>
              </div>

              <div className="pricing-cards">
                <article className="pricing-panel">
                  <span className="pricing-badge pricing-badge-muted">Free forever</span>
                  <span className="price">$0</span>
                  <h3>Free</h3>
                  <p className="pricing-subline">Try AEO scanning on your most important pages - no commitment.</p>
                  <ul>
                    <li><CheckCircle weight="fill" className="h-4 w-4" /> 3 scans per month</li>
                    <li><CheckCircle weight="fill" className="h-4 w-4" /> 5-page audit runs</li>
                    <li><CheckCircle weight="fill" className="h-4 w-4" /> 1 monitored URL</li>
                  </ul>
                  <a href="#scanner" className="btn btn-secondary">Start free scan</a>
                </article>

                <article className="pricing-panel">
                  {plan === "onetime"
                    ? <span className="pricing-badge pricing-badge-blue">Current plan</span>
                    : <span className="pricing-badge pricing-badge-blue">One-time</span>}
                  <span className="price">$9 <small>one-time</small></span>
                  <h3>Starter</h3>
                  <p className="pricing-subline">A single deep-dive audit - great for one-off projects or clients.</p>
                  <ul>
                    <li><CheckCircle weight="fill" className="h-4 w-4" /> Unlimited scans</li>
                    <li><CheckCircle weight="fill" className="h-4 w-4" /> 50-page audit runs</li>
                    <li><CheckCircle weight="fill" className="h-4 w-4" /> 1 monitored URL</li>
                    <li><CheckCircle weight="fill" className="h-4 w-4" /> 3 re-scan snapshots</li>
                    <li><CheckCircle weight="fill" className="h-4 w-4" /> PDF export included</li>
                  </ul>
                  <UpgradeButton
                    plan="onetime"
                    className="btn btn-outline-white"
                    isCurrentPlan={plan === "onetime" || plan === "pro" || plan === "agency"}
                    includedInPlan={plan === "pro" || plan === "agency"}
                  >
                    {plan === "onetime" ? "Active plan" : "Buy once - $9"}
                  </UpgradeButton>
                </article>

                <article className="pricing-panel pricing-panel-featured">
                  {plan === "pro"
                    ? <span className="pricing-badge pricing-badge-purple">Current plan</span>
                    : <span className="pricing-badge pricing-badge-purple">Best value</span>}
                  <span className="price">$19 <small>/month</small></span>
                  <h3>Pro</h3>
                  <p className="pricing-subline">Ongoing monitoring and reports for growing businesses.</p>
                  <ul>
                    <li><CheckCircle weight="fill" className="h-4 w-4" /> Unlimited scans</li>
                    <li><CheckCircle weight="fill" className="h-4 w-4" /> 100-page audit runs</li>
                    <li><CheckCircle weight="fill" className="h-4 w-4" /> 10 monitored URLs</li>
                    <li><CheckCircle weight="fill" className="h-4 w-4" /> 10 re-scan snapshots</li>
                    <li><CheckCircle weight="fill" className="h-4 w-4" /> PDF export + priority support</li>
                  </ul>
                  <UpgradeButton plan="pro" className="btn btn-primary" isCurrentPlan={plan === "pro" || plan === "agency"}>
                    {plan === "pro" ? "Active plan" : plan === "agency" ? "Included" : "Start Pro"}
                  </UpgradeButton>
                  {(plan === "pro" || plan === "agency") && portalUrl && (
                    <a
                      href={portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "block", textAlign: "center", marginTop: 10, fontSize: 13, color: "rgba(255,255,255,0.5)", textDecoration: "none" }}
                      onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                      onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                    >
                      Manage subscription
                    </a>
                  )}
                </article>

                <article className="pricing-panel">
                  {plan === "agency"
                    ? <span className="pricing-badge pricing-badge-agency">Current plan</span>
                    : <span className="pricing-badge pricing-badge-agency">Agency</span>}
                  <span className="price">$49 <small>/month</small></span>
                  <h3>Agency</h3>
                  <p className="pricing-subline">Unlimited scale for agencies managing multiple clients.</p>
                  <ul>
                    <li><CheckCircle weight="fill" className="h-4 w-4" /> Unlimited scans</li>
                    <li><CheckCircle weight="fill" className="h-4 w-4" /> 500-page audit runs</li>
                    <li><CheckCircle weight="fill" className="h-4 w-4" /> Unlimited monitored URLs</li>
                    <li><CheckCircle weight="fill" className="h-4 w-4" /> 20 re-scan snapshots</li>
                    <li><CheckCircle weight="fill" className="h-4 w-4" /> PDF export + priority support</li>
                  </ul>
                  <UpgradeButton plan="agency" className="btn btn-outline-agency" isCurrentPlan={plan === "agency"}>
                    {plan === "agency" ? "Active plan" : "Start Agency"}
                  </UpgradeButton>
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
                {faqs.map(([question, answer], index) => (
                  <div key={question} className={`faq-item${activeFaq === index ? " is-open" : ""}`}>
                    <button
                      type="button"
                      className="faq-question-row"
                      aria-expanded={activeFaq === index}
                      onClick={() => setActiveFaq(index)}
                    >
                      <span className="faq-question-text">{question}</span>
                      <span className="faq-icon-wrap" aria-hidden="true">
                        <CaretRight weight="bold" size={16} />
                      </span>
                    </button>
                    <div className="faq-answer-shell" aria-hidden={activeFaq !== index}>
                      <div className="faq-answer">
                        <p>
                          {answer}
                          {question === "What does the scanner check?" && (
                            <>
                              {" "}For schema best practices, see{" "}
                              <a
                                href="https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Google Search Central structured data docs
                              </a>.
                            </>
                          )}
                          {question === "Is this the same as a traditional SEO audit?" && (
                            <>
                              {" "}You can <a href="#scanner">run a free scan here</a> to see the difference.
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
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
              <Suspense fallback={<div className="surface contact-form-shell" style={{ minHeight: 420 }} />}><ContactForm /></Suspense>
            </div>
          </section>
        </>
      )}

      {isClient && state === "loading" && createPortal(
        <div className="loading-overlay" role="dialog" aria-modal="true" aria-label="Running AI visibility scan">
          <div className="loading-dialog">
            <LoadingState progress={loaderProgress} progressByStepAndStatus={progressByStepAndStatus} />
          </div>
        </div>,
        document.body
      )}

      {isClient && compareState === "loading" && createPortal(
        <div className="loading-overlay" role="dialog" aria-modal="true" aria-label="Running competitor comparison">
          <div className="loading-dialog">
            <LoadingState mode="compare" step={compareSimStep} />
          </div>
        </div>,
        document.body
      )}

      {state === "paywall" && (
        <section className="launch-container paywall-section">
          <div className="pricing-panel">
            <span className="price">$9</span>
            <strong>Scan limit reached</strong>
            <p>{errorMsg || "Upgrade your plan to unlock the full report, schema recommendations, implementation checklist, and PDF export."}</p>
            <UpgradeButton plan="pro">Upgrade to unlock</UpgradeButton>
            <button onClick={() => setState("idle")} className="btn btn-secondary">Back to scanner</button>
          </div>
        </section>
      )}

      {isClient && showLimitModal && createPortal(
        <div className="waitlist-modal-overlay" onClick={() => setShowLimitModal(false)}>
          <div className="waitlist-modal" onClick={(e) => e.stopPropagation()}>
            <div className="waitlist-modal-head">
              <h3>
                {limitModalType === "guest"
                  ? "You've used your free preview scan"
                  : limitModalType === "competitor"
                    ? "Competitor comparison is a paid feature"
                    : "You've used your free scans this month"}
              </h3>
              <p>
                {limitModalType === "guest"
                  ? "Create a free account to get 3 scans per month, then run a new scan and unlock the full report from your results."
                  : limitModalType === "competitor"
                    ? "Upgrade to a Full Report or Pro Monthly to compare your site against competitors."
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
              ) : limitModalType === "competitor" ? (
                <>
                  <button type="button" className="btn btn-primary" onClick={() => { setShowLimitModal(false); document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" }); }}>View pricing</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowLimitModal(false)}>Cancel</button>
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
                <CheckCircle weight="fill" className="h-5 w-5" />
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
                <XCircle weight="fill" className="h-7 w-7" />
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

// Reads search params to initialise the scanner tab from ?tab= URL parameter.
// Isolated here so useSearchParams() doesn't suspend the entire HomeInner tree.
function SearchParamsTabSync({ onTab }: { onTab: (tab: ScannerTab) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "scan" || tab === "compare" || tab === "monitor" || tab === "audit") {
      onTab(tab as ScannerTab);
    }
  }, [searchParams, onTab]);
  return null;
}

export default function Home(props: HomePageClientProps) {
  return <HomeInner {...props} />;
}









