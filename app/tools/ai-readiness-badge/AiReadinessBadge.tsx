"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { normalizeBadgeDomain } from "@/lib/badge";

const SITE = "https://www.aeocheck.co";

function CopyBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="llms-tool-result">
      <div className="llms-tool-result-head">
        <p><strong>{label}</strong></p>
        <div className="llms-tool-actions">
          <button type="button" className="btn btn-secondary" onClick={copy}>
            {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
          </button>
        </div>
      </div>
      <textarea className="llms-tool-output fix-pack-output" style={{ minHeight: 96 }} value={value} readOnly spellCheck={false} aria-label={label} />
    </div>
  );
}

export default function AiReadinessBadge() {
  const [input, setInput] = useState("");
  const [domain, setDomain] = useState<string | null>(null);
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const d = normalizeBadgeDomain(input);
    if (!d) {
      setDomain(null);
      setError("Enter a domain like example.com.");
      return;
    }
    setError("");
    setDomain(d);
  }

  const badgeUrl = domain ? `${SITE}/api/badge?domain=${encodeURIComponent(domain)}` : "";
  const target = `${SITE}/ai-seo-audit?ref=badge`;
  const html = `<a href="${target}"><img src="${badgeUrl}" alt="AI readiness score for ${domain} by AEOCheck" width="148" height="22"></a>`;
  const markdown = `[![AI readiness score for ${domain} by AEOCheck](${badgeUrl})](${target})`;

  return (
    <div className="surface llms-tool">
      <form onSubmit={submit} className="vis-form-row">
        <input
          className="vis-prompts"
          style={{ minHeight: 0 }}
          placeholder="yourdomain.com"
          aria-label="Your domain"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">Create badge</button>
      </form>
      {error && <p className="faq-tool-warnings" role="alert">{error}</p>}
      {domain && (
        <>
          <p style={{ marginTop: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/badge?domain=${encodeURIComponent(domain)}`} alt={`AI readiness score for ${domain}`} width={148} height={22} />
          </p>
          <p className="section-kicker">The first load scans your homepage and can take a few seconds. Then it is cached for a day.</p>
          <CopyBox label="HTML" value={html} />
          <CopyBox label="Markdown (README)" value={markdown} />
        </>
      )}
    </div>
  );
}
