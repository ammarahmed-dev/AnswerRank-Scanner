"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info, Loader2, Map, XCircle } from "lucide-react";
import type { SitemapIndexCoverage, SitemapIssue } from "@/lib/sitemap-check";

const CLIENT_STORAGE_KEY = "aeocheck_client_id_v1";

type Result = {
  origin: string;
  found: boolean;
  tried?: string[];
  sitemapUrl?: string;
  kind?: "urlset" | "index";
  inRobots?: boolean;
  indexCoverage?: SitemapIndexCoverage;
  children?: Array<{ url: string; urlCount?: number; error?: string }>;
  urlCount?: number;
  uniqueUrlCount?: number;
  withLastmod?: number;
  issues: SitemapIssue[];
  statuses?: Array<{ url: string; status: number | null; location?: string }>;
};

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

const ICON = { error: XCircle, warning: AlertTriangle, info: Info } as const;

export default function SitemapChecker() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [resultVersion, setResultVersion] = useState(0);
  const [error, setError] = useState("");

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || state === "loading") return;
    setState("loading");
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/tools/sitemap-checker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, clientId: getClientId() }),
      });
      const data = (await res.json()) as Partial<Result> & { error?: string };
      if (!res.ok || !data.issues) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }
      setResult(data as Result);
      setResultVersion((version) => version + 1);
      setState("done");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setState("error");
    }
  }

  const errors = result?.issues.filter((i) => i.level === "error").length ?? 0;
  const warnings = result?.issues.filter((i) => i.level === "warning").length ?? 0;
  const partialIndex = result?.kind === "index" && (!result.indexCoverage || result.indexCoverage.parsed < result.indexCoverage.listed);
  const tone = !result?.found || errors ? "bad" : warnings || partialIndex ? "warn" : "good";

  return (
    <div className="surface llms-tool">
      <form className="llms-tool-form" onSubmit={check}>
        <label className="hero-input-wrap">
          <Map className="h-5 w-5" aria-hidden="true" />
          <input type="text" inputMode="url" placeholder="https://yourwebsite.com" aria-label="Website URL" value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary" disabled={state === "loading" || !url.trim()}>
          {state === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking...</> : "Check sitemap"}
        </button>
      </form>

      {state === "error" && <p role="alert" className="llms-tool-error">{error}</p>}

      {state === "done" && result && (
        <div key={resultVersion} className="llms-tool-result">
          <div className={`crawler-verdict crawler-verdict-${tone}`}>
            {result.found ? (
              <>
                <strong>
                  {result.kind === "index" ? `Sitemap index: ${result.urlCount} URLs in parsed children` : `Sitemap found: ${result.urlCount} URL${result.urlCount === 1 ? "" : "s"}`}
                </strong>
                <p>
                  <code>{result.sitemapUrl}</code>
                </p>
                {result.kind === "index" && <p className="sitemap-index-coverage">{result.indexCoverage
                  ? `Parsed ${result.indexCoverage.parsed} of ${result.indexCoverage.listed} listed child entries; ${result.indexCoverage.selected} selected within the five-child limit. Totals cover parsed children only.`
                  : "Child coverage is unavailable for this result. Totals may be partial; recheck before relying on them."}</p>}
                <p className="crawler-verdict-meta">Sampled inspection, not a full XML schema validation, index coverage report or proof of AI citations. URL spot checks cover at most eight listed pages.</p>
                <p className="crawler-verdict-meta">
                  {result.withLastmod} with lastmod, {result.uniqueUrlCount} unique. {errors} error{errors === 1 ? "" : "s"}, {warnings} warning{warnings === 1 ? "" : "s"}.
                </p>
              </>
            ) : (
              <>
                <strong>No sitemap parsed in checked locations</strong>
                <p className="crawler-verdict-meta">Checked: {result.tried?.length ? result.tried.join("; ") : "robots.txt, /sitemap.xml, /sitemap_index.xml"}</p>
              </>
            )}
          </div>

          {result.issues.length > 0 && (
            <ul className="extract-list">
              {result.issues.map((issue, i) => {
                const Icon = ICON[issue.level];
                return (
                  <li key={`${i}-${issue.message}`} className={issue.level === "error" ? "is-blocked" : issue.level === "info" ? "" : "sitemap-warn"}>
                    <div className="extract-head">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <strong>{issue.message}</strong>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {result.found && result.issues.length === 0 && (
            <p className="extract-text"><CheckCircle2 className="h-4 w-4 inline" aria-hidden="true" /> No issues detected in the inspected data.</p>
          )}

          {result.children && result.children.length > 0 && (
            <div className="sitemap-group">
              <h2>Child sitemaps</h2>
              <ul className="extract-list">
                {result.children.map((c) => (
                  <li key={c.url} className={c.error ? "is-blocked" : undefined}>
                    <div className="extract-head"><strong>{c.url}</strong><span>{c.error ?? `${c.urlCount} URLs parsed`}</span></div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.statuses && result.statuses.length > 0 && (
            <div className="sitemap-group">
              <h2>Spot check of listed URLs</h2>
              <ul className="extract-list">
                {result.statuses.map((s) => (
                  <li key={s.url} className={s.status !== null && s.status < 300 ? "is-allowed" : "is-blocked"}>
                    <div className="extract-head"><strong>{s.url}</strong><span>{s.status ?? "no response"}{s.location ? ` to ${s.location}` : ""}</span></div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="llms-tool-cta">
            <p>The scan adds 25 readiness checks. Sitemap discovery and sampled checks do not prove indexing or AI citations.</p>
            <Link href="/#scanner" className="btn btn-primary">Run a free AEO scan</Link>
          </div>
        </div>
      )}
    </div>
  );
}
