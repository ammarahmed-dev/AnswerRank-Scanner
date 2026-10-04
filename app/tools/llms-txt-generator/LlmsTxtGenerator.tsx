"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, FileText, Loader2 } from "lucide-react";

const CLIENT_STORAGE_KEY = "aeocheck_client_id_v1";

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

export default function LlmsTxtGenerator() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState("");
  const [meta, setMeta] = useState<{ siteName: string; pageCount: number } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || state === "loading") return;
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/tools/llms-txt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, clientId: getClientId() }),
      });
      const data = (await res.json()) as { llmsTxt?: string; siteName?: string; pageCount?: number; error?: string };
      if (!res.ok || !data.llmsTxt) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }
      setResult(data.llmsTxt);
      setMeta({ siteName: data.siteName ?? "", pageCount: data.pageCount ?? 0 });
      setState("done");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setState("error");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the text stays selectable in the editor.
    }
  }

  function download() {
    const blob = new Blob([result], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "llms.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="surface llms-tool">
      <form className="llms-tool-form" onSubmit={generate}>
        <label className="hero-input-wrap">
          <FileText className="h-5 w-5" aria-hidden="true" />
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
          {state === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> Reading your site...</> : "Generate llms.txt"}
        </button>
      </form>

      {state === "error" && <p role="alert" className="llms-tool-error">{error}</p>}

      {state === "done" && (
        <div className="llms-tool-result">
          <div className="llms-tool-result-head">
            <p>
              Generated from {meta?.pageCount ?? 0} page{meta?.pageCount === 1 ? "" : "s"}
              {meta?.siteName ? ` of ${meta.siteName}` : ""}. Review it, then upload it as <code>/llms.txt</code> at your domain root.
            </p>
            <div className="llms-tool-actions">
              <button type="button" className="btn btn-secondary" onClick={copy}>
                {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
              </button>
              <button type="button" className="btn btn-secondary" onClick={download}>
                <Download className="h-4 w-4" /> Download
              </button>
            </div>
          </div>
          <textarea
            className="llms-tool-output"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            spellCheck={false}
            aria-label="Generated llms.txt"
          />
          <div className="llms-tool-cta">
            <p>llms.txt is one of 25 AI visibility signals. See how the rest of your site scores.</p>
            <Link href="/#scanner" className="btn btn-primary">Run a free AEO scan</Link>
          </div>
        </div>
      )}
    </div>
  );
}
