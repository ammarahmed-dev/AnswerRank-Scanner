"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, FileSearch, Loader2, XCircle } from "lucide-react";
import { ISSUE_COPY, type ExtractabilityResult } from "@/lib/extractability";

const CLIENT_STORAGE_KEY = "aeocheck_client_id_v1";

type Result = ExtractabilityResult & { url: string };

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

function tone(score: number): "good" | "warn" | "bad" {
  return score >= 70 ? "good" : score >= 40 ? "warn" : "bad";
}

export default function ContentExtractability() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function analyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || state === "loading") return;
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/tools/content-extractability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, clientId: getClientId() }),
      });
      const data = (await res.json()) as Partial<Result> & { error?: string };
      if (!res.ok || !data.passages) {
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
      <form className="llms-tool-form" onSubmit={analyze}>
        <label className="hero-input-wrap">
          <FileSearch className="h-5 w-5" aria-hidden="true" />
          <input
            type="text"
            inputMode="url"
            placeholder="https://yourwebsite.com/a-page"
            aria-label="Page URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={state === "loading" || !url.trim()}>
          {state === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing...</> : "Analyze page"}
        </button>
      </form>

      {state === "error" && <p role="alert" className="llms-tool-error">{error}</p>}

      {state === "done" && result && (
        <div className="llms-tool-result">
          <div className={`crawler-verdict crawler-verdict-${result.passages.length ? tone(result.score) : "bad"}`}>
            {result.passages.length ? (
              <>
                <strong>{result.quotableCount} of {result.passages.length} sections open with a quotable answer ({result.score}%)</strong>
                <p>
                  {result.questionHeadingCount} question-style heading{result.questionHeadingCount === 1 ? "" : "s"},{" "}
                  {result.dataPointCount} opening passage{result.dataPointCount === 1 ? "" : "s"} with a concrete number.
                </p>
              </>
            ) : (
              <>
                <strong>No H2 or H3 sections found</strong>
                <p>AI engines quote passages under clear headings. Break this page into sections that each answer one question.</p>
              </>
            )}
            {result.notes.map((n) => <p key={n} className="crawler-verdict-meta">{n}</p>)}
          </div>

          {result.passages.length > 0 && (
            <ul className="extract-list">
              {result.passages.map((p, i) => (
                <li key={`${i}-${p.heading}`} className={p.quotable ? "is-allowed" : "is-blocked"}>
                  <div className="extract-head">
                    {p.quotable ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
                    <strong>{p.heading}</strong>
                    <span>{p.words} words</span>
                  </div>
                  {p.text && <p className="extract-text">{p.text}</p>}
                  {p.issues.map((issue) => <p key={issue} className="extract-issue">{ISSUE_COPY[issue]}</p>)}
                </li>
              ))}
            </ul>
          )}

          <div className="llms-tool-cta">
            <p>This checks passage structure only. See how the whole page scores across 25 AI visibility signals.</p>
            <Link href="/#scanner" className="btn btn-primary">Run a free AEO scan</Link>
          </div>
        </div>
      )}
    </div>
  );
}
