"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download } from "lucide-react";
import { articleSchemaProblems, articleSchemaScriptTag, type ArticleInput, type ArticleType } from "@/lib/article-schema";

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY = { headline: "", url: "", description: "", image: "", datePublished: "", dateModified: "", authorName: "", authorUrl: "", publisherName: "", publisherLogo: "" };

export default function ArticleSchemaGenerator() {
  const [form, setForm] = useState(EMPTY);
  const [type, setType] = useState<ArticleType>("BlogPosting");
  const [copied, setCopied] = useState(false);

  const input: ArticleInput = useMemo(() => ({ ...form, type }), [form, type]);
  const started = Boolean(form.headline || form.url || form.authorName || form.datePublished);
  const problems = useMemo(() => (started ? articleSchemaProblems(input) : []), [started, input]);
  const ready = started && articleSchemaProblems(input).length === 0;
  const output = useMemo(() => (ready ? articleSchemaScriptTag(input) : ""), [ready, input]);

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

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
    link.download = "article-schema.html";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="surface llms-tool faq-tool">
      <div className="org-fields">
        <select aria-label="Article type" className="article-type" value={type} onChange={(e) => setType(e.target.value as ArticleType)}>
          <option value="BlogPosting">BlogPosting (blog post)</option>
          <option value="Article">Article</option>
          <option value="NewsArticle">NewsArticle (news)</option>
        </select>
        <input type="text" placeholder="Headline *" aria-label="Headline" value={form.headline} onChange={set("headline")} />
        <input type="text" inputMode="url" placeholder="Article URL * (https://example.com/blog/post)" aria-label="Article URL" value={form.url} onChange={set("url")} />
        <textarea rows={2} placeholder="Short description or summary" aria-label="Description" value={form.description} onChange={set("description")} />
        <input type="text" inputMode="url" placeholder="Main image URL (https://example.com/cover.png)" aria-label="Image URL" value={form.image} onChange={set("image")} />
        <div className="vis-form-row">
          <input type="text" placeholder="Published * (YYYY-MM-DD)" aria-label="Date published" value={form.datePublished} onChange={set("datePublished")} onFocus={() => !form.datePublished && setForm((p) => ({ ...p, datePublished: today() }))} />
          <input type="text" placeholder="Last modified (YYYY-MM-DD)" aria-label="Date modified" value={form.dateModified} onChange={set("dateModified")} />
        </div>
        <div className="vis-form-row">
          <input type="text" placeholder="Author name *" aria-label="Author name" value={form.authorName} onChange={set("authorName")} />
          <input type="text" inputMode="url" placeholder="Author page URL (optional)" aria-label="Author URL" value={form.authorUrl} onChange={set("authorUrl")} />
        </div>
        <div className="vis-form-row">
          <input type="text" placeholder="Publisher / site name (optional)" aria-label="Publisher name" value={form.publisherName} onChange={set("publisherName")} />
          <input type="text" inputMode="url" placeholder="Publisher logo URL (optional)" aria-label="Publisher logo URL" value={form.publisherLogo} onChange={set("publisherLogo")} />
        </div>
      </div>

      <div className="llms-tool-result">
        <div className="llms-tool-result-head">
          <p>Paste this into the <code>&lt;head&gt;</code> of the article page. The headline, author and dates must match what readers see on the page.</p>
          <div className="llms-tool-actions">
            <button type="button" className="btn btn-secondary" onClick={copy} disabled={!ready}>
              {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
            </button>
            <button type="button" className="btn btn-secondary" onClick={download} disabled={!ready}>
              <Download className="h-4 w-4" /> Download
            </button>
          </div>
        </div>
        {problems.length > 0 && (
          <ul className="faq-tool-warnings" aria-live="polite">
            {problems.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}
        <textarea className="llms-tool-output" value={output} readOnly spellCheck={false} aria-label="Article JSON-LD" placeholder="Fill in the required fields (*) to generate your markup." />
        <div className="llms-tool-cta">
          <p>Verify the published page with the <Link href="/tools/schema-checker">schema markup checker</Link>.</p>
          <Link href="/#scanner" className="btn btn-primary">Run a free AEO scan</Link>
        </div>
      </div>
    </div>
  );
}
