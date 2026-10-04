"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Code2, Loader2, XCircle } from "lucide-react";
import type { SchemaCheckResult } from "@/lib/schema-check";

const CLIENT_STORAGE_KEY = "aeocheck_client_id_v1";

type Result = SchemaCheckResult & { url: string };

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

export default function SchemaChecker() {
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
      const res = await fetch("/api/tools/schema-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, clientId: getClientId() }),
      });
      const data = (await res.json()) as Partial<Result> & { error?: string };
      if (!res.ok || !data.blocks) {
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

  const invalid = result?.blocks.filter((b) => !b.valid) ?? [];
  const tone = !result || !result.blocks.length || invalid.length ? "bad" : result.entities.some((e) => e.missingRequired.length) ? "warn" : "good";

  return (
    <div className="surface llms-tool">
      <form className="llms-tool-form" onSubmit={check}>
        <label className="hero-input-wrap">
          <Code2 className="h-5 w-5" aria-hidden="true" />
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
          {state === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking...</> : "Check schema"}
        </button>
      </form>

      {state === "error" && <p role="alert" className="llms-tool-error">{error}</p>}

      {state === "done" && result && (
        <div className="llms-tool-result">
          <div className={`crawler-verdict crawler-verdict-${tone}`}>
            <strong>
              {result.blocks.length
                ? `${result.blocks.length} JSON-LD block${result.blocks.length === 1 ? "" : "s"}, ${result.types.length} type${result.types.length === 1 ? "" : "s"} found`
                : "No structured data found"}
            </strong>
            {result.types.length > 0 && <p>{result.types.join(", ")}</p>}
            {result.suggestions.map((s) => <p key={s} className="crawler-verdict-meta">{s}</p>)}
          </div>

          {invalid.length > 0 && (
            <ul className="extract-list">
              {invalid.map((b) => (
                <li key={b.index} className="is-blocked">
                  <div className="extract-head"><XCircle className="h-4 w-4" aria-hidden="true" /><strong>Block {b.index} is not valid JSON</strong></div>
                  <p className="extract-issue">{b.error}</p>
                </li>
              ))}
            </ul>
          )}

          {result.entities.length > 0 && (
            <ul className="extract-list">
              {result.entities.map((e, i) => {
                const ok = e.missingRequired.length === 0;
                return (
                  <li key={`${e.type}-${i}`} className={ok ? "is-allowed" : "is-blocked"}>
                    <div className="extract-head">
                      {ok ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
                      <strong>{e.type}</strong>
                    </div>
                    {e.missingRequired.length > 0 && <p className="extract-issue">Missing required: {e.missingRequired.join(", ")}</p>}
                    {e.missingRecommended.length > 0 && <p className="extract-text">Recommended to add: {e.missingRecommended.join(", ")}</p>}
                    {ok && e.missingRecommended.length === 0 && <p className="extract-text">Required and recommended properties present.</p>}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="llms-tool-cta">
            <p>This reads JSON-LD only. See how the page scores across 25 AI visibility signals, including schema.</p>
            <Link href="/#scanner" className="btn btn-primary">Run a free AEO scan</Link>
          </div>
        </div>
      )}
    </div>
  );
}
