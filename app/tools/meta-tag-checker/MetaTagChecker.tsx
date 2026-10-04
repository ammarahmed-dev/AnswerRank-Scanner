"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, Loader2, Tags, XCircle } from "lucide-react";
import type { MetaReport } from "@/lib/meta-check";

const CLIENT_STORAGE_KEY = "aeocheck_client_id_v1";

type Result = MetaReport & { url: string };

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

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);
const host = (url: string) => { try { return new URL(url).hostname; } catch { return url; } };

export default function MetaTagChecker() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || state === "loading") return;
    setState("loading");
    setError("");
    setImageFailed(false);
    try {
      const res = await fetch("/api/tools/meta-tag-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, clientId: getClientId() }),
      });
      const data = (await res.json()) as Partial<Result> & { error?: string };
      if (!res.ok || !data.checks) {
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

  const v = result?.values;
  const fails = result?.checks.filter((c) => c.status === "fail").length ?? 0;
  const warns = result?.checks.filter((c) => c.status === "warn").length ?? 0;

  return (
    <div className="surface llms-tool">
      <form className="llms-tool-form" onSubmit={check}>
        <label className="hero-input-wrap">
          <Tags className="h-5 w-5" aria-hidden="true" />
          <input type="text" inputMode="url" placeholder="https://yourwebsite.com/a-page" aria-label="Page URL" value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={state === "loading" || !url.trim()}>
          {state === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking...</> : "Check meta tags"}
        </button>
      </form>

      {state === "error" && <p role="alert" className="llms-tool-error">{error}</p>}

      {state === "done" && result && v && (
        <div className="llms-tool-result">
          <div className={`crawler-verdict crawler-verdict-${fails ? "bad" : warns ? "warn" : "good"}`}>
            <strong>{fails} problem{fails === 1 ? "" : "s"}, {warns} warning{warns === 1 ? "" : "s"}</strong>
            <p className="crawler-verdict-meta">{result.url}</p>
          </div>

          <div className="meta-previews">
            <div className="meta-serp" aria-label="Search result preview">
              <span className="meta-serp-url">{host(result.url)}</span>
              <span className="meta-serp-title">{clip(v.title || "(no title)", 60)}</span>
              <span className="meta-serp-desc">{clip(v.description || "No meta description. Search engines will pick text from the page.", 160)}</span>
            </div>
            <div className="meta-card" aria-label="Social card preview">
              {v.ogImage && !imageFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.ogImage} alt="" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} />
              ) : (
                <div className="meta-card-empty">{v.ogImage ? "og:image could not be loaded" : "No og:image"}</div>
              )}
              <div className="meta-card-body">
                <span>{host(result.url)}</span>
                <strong>{clip(v.ogTitle || v.title || "(no title)", 70)}</strong>
                <span>{clip(v.ogDescription || v.description || "", 110)}</span>
              </div>
            </div>
          </div>

          <ul className="extract-list">
            {result.checks.map((c) => (
              <li key={c.id} className={c.status === "pass" ? "is-allowed" : c.status === "fail" ? "is-blocked" : "sitemap-warn"}>
                <div className="extract-head">
                  {c.status === "pass" ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : c.status === "fail" ? <XCircle className="h-4 w-4" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
                  <strong>{c.label}</strong>
                </div>
                <p className="extract-text">{c.detail}</p>
              </li>
            ))}
          </ul>

          <div className="llms-tool-cta">
            <p>Meta tags are 5 of 25 AI visibility signals. See how the whole page scores.</p>
            <Link href="/#scanner" className="btn btn-primary">Run a free AEO scan</Link>
          </div>
        </div>
      )}
    </div>
  );
}
