"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileText, Loader2, XCircle } from "lucide-react";

const CLIENT_STORAGE_KEY = "aeocheck_client_id_v1";
const AGENTS = ["Googlebot", "Bingbot", "GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "*"];

type Result = {
  origin: string;
  robotsUrl: string;
  found: boolean;
  agent: string;
  path: string;
  allowed: boolean;
  rule: { allow: boolean; path: string } | null;
  source: "own" | "wildcard" | "none";
  robotsTxt?: string;
};

const SOURCE_COPY = {
  own: "The rules in this crawler's own group decided it.",
  wildcard: "This crawler has no group of its own, so the rules for User-agent: * applied.",
  none: "No group applies to this crawler, so it is allowed by default.",
} as const;

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

export default function RobotsTxtTester() {
  const [url, setUrl] = useState("");
  const [agent, setAgent] = useState("Googlebot");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function test(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !agent.trim() || state === "loading") return;
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/tools/robots-tester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, agent, clientId: getClientId() }),
      });
      const data = (await res.json()) as Partial<Result> & { error?: string };
      if (!res.ok || typeof data.allowed !== "boolean") {
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

  return (
    <div className="surface llms-tool">
      <form className="llms-tool-form" onSubmit={test}>
        <label className="hero-input-wrap">
          <FileText className="h-5 w-5" aria-hidden="true" />
          <input
            type="text"
            inputMode="url"
            placeholder="https://yourwebsite.com/page-to-test"
            aria-label="Page URL to test"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <label className="hero-input-wrap">
          <input
            type="text"
            list="robots-tester-agents"
            placeholder="Googlebot"
            aria-label="Crawler (user-agent)"
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
          />
          <datalist id="robots-tester-agents">
            {AGENTS.map((a) => <option key={a} value={a} />)}
          </datalist>
        </label>
        <button type="submit" className="btn btn-primary" disabled={state === "loading" || !url.trim() || !agent.trim()}>
          {state === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> Testing...</> : "Test robots.txt"}
        </button>
      </form>

      {state === "error" && <p role="alert" className="llms-tool-error">{error}</p>}

      {state === "done" && result && (
        <div className="llms-tool-result">
          <div className={`crawler-verdict crawler-verdict-${result.allowed ? "good" : "bad"}`}>
            <strong className="flex items-center gap-2">
              {result.allowed ? <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> : <XCircle className="h-5 w-5" aria-hidden="true" />}
              {result.allowed ? "Allowed" : "Blocked"}
            </strong>
            <p>
              <code>{result.agent}</code> {result.allowed ? "may" : "may not"} fetch <code>{result.path || "/"}</code> on {result.origin}.
            </p>
            <p>
              {result.rule ? (
                <>Deciding rule: <code>{result.rule.allow ? "Allow" : "Disallow"}: {result.rule.path}</code>. </>
              ) : (
                <>No rule matched this path. </>
              )}
              {result.found ? SOURCE_COPY[result.source] : "No robots.txt was found, so everything is allowed."}
            </p>
            <p className="crawler-verdict-meta">
              {result.found ? <>Read from <code>{result.robotsUrl}</code></> : <>Looked for <code>{result.robotsUrl}</code></>}
            </p>
          </div>

          {result.robotsTxt && (
            <details className="crawler-robots">
              <summary>View robots.txt</summary>
              <pre>{result.robotsTxt}</pre>
            </details>
          )}

          <div className="llms-tool-cta">
            <p>
              Checking AI bots too? Use the <Link href="/tools/ai-crawler-checker">AI crawler checker</Link> to see every major one at once.
            </p>
            <Link href="/#scanner" className="btn btn-primary">Run a free AEO scan</Link>
          </div>
        </div>
      )}
    </div>
  );
}
