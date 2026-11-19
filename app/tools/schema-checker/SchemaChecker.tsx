"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleHelp, Code2, Loader2, XCircle } from "lucide-react";
import type { SchemaCheckResult } from "@/lib/schema-check";
import { schemaCheckSummary } from "@/lib/schema-check-summary";

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

export default function SchemaChecker({ focus = "all" }: { focus?: "all" | "faq" }) {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || state === "loading") return;
    setState("loading");
    setError("");
    setResult(null);
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
  const faqEntities = result?.entities.filter((entity) => entity.type === "FAQPage") ?? [];
  const shownEntities = focus === "faq" ? faqEntities : result?.entities ?? [];
  const faqNeedsFixes = faqEntities.some((entity) => entity.missingRequired.length > 0);
  const summary = result ? schemaCheckSummary(result) : null;
  const tone = focus === "faq"
    ? !result || !faqEntities.length || invalid.length ? "bad" : faqNeedsFixes ? "warn" : "good"
    : summary?.tone ?? "warn";

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
          {state === "loading" ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking...</> : focus === "faq" ? "Check FAQ schema" : "Check schema"}
        </button>
      </form>

      {state === "error" && <p role="alert" className="llms-tool-error">{error}</p>}

      {state === "done" && result && (
        <div className="llms-tool-result">
          <div className={`crawler-verdict crawler-verdict-${tone}`}>
            <strong>
              {focus === "faq"
                ? !result.blocks.length
                  ? "No JSON-LD blocks found"
                  : !faqEntities.length
                    ? "No FAQPage JSON-LD found"
                    : invalid.length
                      ? "FAQPage found, but some JSON-LD blocks are invalid"
                      : faqNeedsFixes
                        ? "FAQPage found with missing question or answer fields"
                        : `${faqEntities.length} FAQPage declaration${faqEntities.length === 1 ? "" : "s"} found with required fields`
                : summary?.title}
            </strong>
            {focus === "faq" ? (
              <>
                <p>{faqEntities.length
                  ? "Checks FAQPage declarations and their required question/answer fields. Compare the markup with the questions visible on your page."
                  : "The page may contain other JSON-LD types, but no FAQPage declaration was detected."}</p>
                <p className="crawler-verdict-meta">This is a JSON-LD field check, not a full schema.org validation or a Google rich-result eligibility test.</p>
              </>
            ) : (
              <>
                <p>{`JSON syntax: ${result.blocks.filter((block) => block.valid).length} of ${result.blocks.length} blocks parsed.`}</p>
                <p className="schema-check-coverage">{`Field checklists applied to ${summary?.checked} of ${result.entities.length} extracted top-level/@graph type declarations.`}</p>
                <p className="crawler-verdict-meta">Nested entities are not generally inspected. FAQPage question and answer fields have specific checks.</p>
                {result.types.length > 0 && <p>{result.types.join(", ")}</p>}
                <p className="crawler-verdict-meta">Checks JSON syntax and selected field presence only. Property value types, context expansion, visible-content accuracy and Google rich-result eligibility are not verified.</p>
                {!result.blocks.length && <p className="crawler-verdict-meta">Microdata, RDFa or markup added after the fetched HTML may still exist.</p>}
                {result.suggestions.map((s) => <p key={s} className="crawler-verdict-meta">{s}</p>)}
              </>
            )}
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

          {shownEntities.length > 0 && (
            <ul className="extract-list">
              {shownEntities.map((e, i) => {
                const assessed = focus === "faq" || e.rulesChecked === true;
                const ok = e.missingRequired.length === 0;
                return (
                  <li key={`${e.type}-${i}`} className={assessed ? ok ? "is-allowed" : "is-blocked" : undefined}>
                    <div className="extract-head">
                      {!assessed ? <CircleHelp className="h-4 w-4" aria-hidden="true" /> : ok ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
                      <strong>{e.type}</strong>
                    </div>
                    {!assessed && <p className="extract-text">No field checklist is available for this type. Its properties were not assessed.</p>}
                    {assessed && e.missingRequired.length > 0 && <p className="extract-issue">{focus === "faq" ? "Missing required" : "Missing checked fields"}: {e.missingRequired.join(", ")}</p>}
                    {assessed && e.missingRecommended.length > 0 && <p className="extract-text">Optional fields to review: {e.missingRecommended.join(", ")}</p>}
                    {assessed && ok && e.missingRecommended.length === 0 && <p className="extract-text">All fields in this tool&apos;s checklist are present.</p>}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="llms-tool-cta">
            <p>{focus === "faq"
              ? "FAQPage markup does not create a Google FAQ rich result. For wider crawlability, metadata, and content checks, try the AEO readiness scan."
              : "For broader vocabulary checks use Schema Markup Validator, or Google’s Rich Results Test for supported search features. The AEO scan adds 25 readiness checks; a score does not prove AI citations."}</p>
            {focus === "all" && <p><a href="https://validator.schema.org/">Schema Markup Validator</a>{" · "}<a href="https://search.google.com/test/rich-results">Google Rich Results Test</a></p>}
            <Link href="/#scanner" className="btn btn-primary">Run a free AEO scan</Link>
          </div>
        </div>
      )}
    </div>
  );
}
