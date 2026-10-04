"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, CheckCircle2, Loader2, XCircle } from "lucide-react";

const CLIENT_STORAGE_KEY = "aeocheck_client_id_v1";

type Kind = "search" | "training" | "user";
type Crawler = { token: string; label: string; kind: Kind; allowed: boolean; source: "own" | "wildcard" | "default" };
type Result = { origin: string; robotsUrl: string; found: boolean; crawlers: Crawler[]; robotsTxt?: string };

const KIND_COPY: Record<Kind, { title: string; blurb: string }> = {
  search: { title: "AI search crawlers", blurb: "Decide whether you can appear and be cited in answers. Blocking these removes you from that engine." },
  training: { title: "AI training crawlers", blurb: "Decide whether your content trains future models. Blocking these does not remove you from AI search answers." },
  user: { title: "User-triggered agents", blurb: "Fetch a page when a person asks about it. Vendors note robots.txt may not apply to these." },
};

const SOURCE_COPY = { own: "Own rule", wildcard: "Inherited from *", default: "No rule (allowed)" } as const;

function getClientId(): string | undefined {
  try {
    const stored = localStorage.getItem(CLIENT_STORAGE_KEY);
    const next = stored || crypto.randomUUID();
    localStorage.setItem(CLIENT_STORAGE_KEY, next);
    return next;
  } catch {
    return undefined;
  }
}

function verdict(crawlers: Crawler[]): { tone: "good" | "warn" | "bad"; title: string; text: string } {
  const searchBlocked = crawlers.filter((c) => c.kind === "search" && !c.allowed);
  const trainingBlocked = crawlers.filter((c) => c.kind === "training" && !c.allowed);
  if (searchBlocked.length) {
    return {
      tone: "bad",
      title: "Blocked from AI search",
      text: `${searchBlocked.map((c) => c.label).join(", ")} cannot read this site, so it cannot appear in those AI answers.`,
    };
  }
  if (trainingBlocked.length) {
    return {
      tone: "warn",
      title: "Visible in AI search, opted out of training",
      text: `AI search crawlers are allowed. ${trainingBlocked.length} training crawler${trainingBlocked.length === 1 ? " is" : "s are"} blocked, which keeps your content out of model training.`,
    };
  }
  return { tone: "good", title: "Open to AI crawlers", text: "No AI crawler is blocked from your site root." };
}

export default function AiCrawlerChecker() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || state === "loading") return;
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/tools/ai-crawler-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, clientId: getClientId() }),
      });
      const data = (await res.json()) as Partial<Result> & { error?: string };
      if (!res.ok || !data.crawlers) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }
      setResult(data as Result);
      setState("done");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setState("error");
    }
  }

  const summary = result ? verdict(result.crawlers) : null;

  return (
    <div className="surface llms-tool">
      <form className="llms-tool-form" onSubmit={check}>
        <label className="hero-input-wrap">
          <Bot className="h-5 w-5" aria-hidden="true" />
          <input
            type="text"
            inputMode="url"
            placeholder="https://yourwebsite.com"
            aria-label="Website URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={state === "loading" || !url.trim()}>
          {state === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking...</> : "Check AI crawlers"}
        </button>
      </form>

      {state === "error" && <p role="alert" className="llms-tool-error">{error}</p>}

      {state === "done" && result && summary && (
        <div className="llms-tool-result">
          <div className={`crawler-verdict crawler-verdict-${summary.tone}`}>
            <strong>{summary.title}</strong>
            <p>{summary.text}</p>
            <p className="crawler-verdict-meta">
              {result.found ? (
                <>Read from <code>{result.robotsUrl}</code></>
              ) : (
                <>No robots.txt found at <code>{result.robotsUrl}</code>, so every crawler is allowed by default.</>
              )}
            </p>
          </div>

          {(["search", "training", "user"] as const).map((kind) => (
            <div key={kind} className="crawler-group">
              <h2>{KIND_COPY[kind].title}</h2>
              <p>{KIND_COPY[kind].blurb}</p>
              <ul>
                {result.crawlers.filter((c) => c.kind === kind).map((c) => (
                  <li key={c.token} className={c.allowed ? "is-allowed" : "is-blocked"}>
                    {c.allowed ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
                    <span className="crawler-name">{c.label}</span>
                    <span className="crawler-source">{SOURCE_COPY[c.source]}</span>
                    <span className="crawler-state">{c.allowed ? "Allowed" : "Blocked"}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {result.robotsTxt && (
            <details className="crawler-robots">
              <summary>View robots.txt</summary>
              <pre>{result.robotsTxt}</pre>
            </details>
          )}

          <div className="llms-tool-cta">
            <p>
              Not sure what to change? See{" "}
              <Link href="/blog/robots-txt-ai-crawlers">copy-paste robots.txt rules for every AI crawler policy</Link>.
            </p>
            <Link href="/#scanner" className="btn btn-primary">Run a free AEO scan</Link>
          </div>
        </div>
      )}
    </div>
  );
}
