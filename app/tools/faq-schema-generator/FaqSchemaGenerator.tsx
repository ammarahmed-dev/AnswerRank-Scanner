"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, Plus, Trash2 } from "lucide-react";
import { cleanFaqPairs, faqSchemaScriptTag, faqSchemaWarnings, type FaqPair } from "@/lib/faq-schema";

type Row = FaqPair & { id: number };

const STARTER: Row[] = [
  { id: 1, question: "", answer: "" },
  { id: 2, question: "", answer: "" },
  { id: 3, question: "", answer: "" },
];

export default function FaqSchemaGenerator() {
  const [rows, setRows] = useState<Row[]>(STARTER);
  const [nextId, setNextId] = useState(4);
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => faqSchemaScriptTag(rows), [rows]);
  const warnings = useMemo(() => faqSchemaWarnings(rows), [rows]);
  const ready = cleanFaqPairs(rows).length > 0;

  function update(id: number, patch: Partial<FaqPair>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function add() {
    setRows((prev) => [...prev, { id: nextId, question: "", answer: "" }]);
    setNextId((n) => n + 1);
  }

  function remove(id: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the text stays selectable in the editor.
    }
  }

  function download() {
    const blob = new Blob([output], { type: "text/html;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "faq-schema.html";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="surface llms-tool faq-tool">
      <div className="faq-tool-rows">
        {rows.map((row, i) => (
          <div key={row.id} className="faq-tool-row">
            <div className="faq-tool-row-head">
              <span>Question {i + 1}</span>
              <button type="button" onClick={() => remove(row.id)} disabled={rows.length === 1} aria-label={`Remove question ${i + 1}`}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <input
              type="text"
              value={row.question}
              onChange={(e) => update(row.id, { question: e.target.value })}
              placeholder="e.g. How much does it cost?"
              aria-label={`Question ${i + 1}`}
            />
            <textarea
              value={row.answer}
              onChange={(e) => update(row.id, { answer: e.target.value })}
              placeholder="Answer it directly in a sentence or two."
              aria-label={`Answer ${i + 1}`}
              rows={3}
            />
          </div>
        ))}
        <button type="button" className="btn btn-secondary faq-tool-add" onClick={add}>
          <Plus className="h-4 w-4" /> Add question
        </button>
      </div>

      <div className="llms-tool-result">
        <div className="llms-tool-result-head">
          <p>Paste this into the <code>&lt;head&gt;</code> or body of the page that shows these questions and answers.</p>
          <div className="llms-tool-actions">
            <button type="button" className="btn btn-secondary" onClick={copy} disabled={!ready}>
              {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
            </button>
            <button type="button" className="btn btn-secondary" onClick={download} disabled={!ready}>
              <Download className="h-4 w-4" /> Download
            </button>
          </div>
        </div>
        {warnings.length > 0 && (
          <ul className="faq-tool-warnings" aria-live="polite">
            {warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        )}
        <textarea className="llms-tool-output" value={output} readOnly spellCheck={false} aria-label="FAQPage JSON-LD" />
        <div className="llms-tool-cta">
          <p>FAQ markup must match visible page content. Check how the rest of your page scores.</p>
          <Link href="/#scanner" className="btn btn-primary">Run a free AEO scan</Link>
        </div>
      </div>
    </div>
  );
}
