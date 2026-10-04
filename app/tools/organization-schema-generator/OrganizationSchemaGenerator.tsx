"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download } from "lucide-react";
import { orgSchemaProblems, orgSchemaScriptTag, type OrgInput } from "@/lib/org-schema";

const EMPTY = { name: "", url: "", logo: "", description: "", sameAs: "", email: "", telephone: "", foundingDate: "" };

export default function OrganizationSchemaGenerator() {
  const [form, setForm] = useState(EMPTY);
  const [includeWebSite, setIncludeWebSite] = useState(true);
  const [copied, setCopied] = useState(false);

  const input: OrgInput = useMemo(
    () => ({ ...form, sameAs: form.sameAs.split("\n"), includeWebSite }),
    [form, includeWebSite]
  );
  const problems = useMemo(() => (form.name || form.url ? orgSchemaProblems(input) : []), [form.name, form.url, input]);
  const ready = Boolean(form.name.trim() && form.url.trim()) && orgSchemaProblems(input).length === 0;
  const output = useMemo(() => (ready ? orgSchemaScriptTag(input) : ""), [ready, input]);

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
    link.download = "organization-schema.html";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="surface llms-tool faq-tool">
      <div className="org-fields">
        <input type="text" placeholder="Organization name *" aria-label="Organization name" value={form.name} onChange={set("name")} />
        <input type="text" inputMode="url" placeholder="Website URL * (https://example.com)" aria-label="Website URL" value={form.url} onChange={set("url")} />
        <input type="text" inputMode="url" placeholder="Logo image URL (https://example.com/logo.png)" aria-label="Logo URL" value={form.logo} onChange={set("logo")} />
        <textarea rows={2} placeholder="One-sentence description of what you do" aria-label="Description" value={form.description} onChange={set("description")} />
        <textarea rows={3} placeholder={"Profile links, one per line\nhttps://www.linkedin.com/company/yourco\nhttps://x.com/yourco"} aria-label="Profile links" value={form.sameAs} onChange={set("sameAs")} />
        <div className="vis-form-row">
          <input type="text" placeholder="Contact email (optional)" aria-label="Email" value={form.email} onChange={set("email")} />
          <input type="text" placeholder="Phone (optional)" aria-label="Telephone" value={form.telephone} onChange={set("telephone")} />
        </div>
        <input type="text" placeholder="Founded (optional, 2019 or 2019-04-30)" aria-label="Founding date" value={form.foundingDate} onChange={set("foundingDate")} />
        <label className="org-check">
          <input type="checkbox" checked={includeWebSite} onChange={(e) => setIncludeWebSite(e.target.checked)} />
          Also add WebSite markup linked to this organization
        </label>
      </div>

      <div className="llms-tool-result">
        <div className="llms-tool-result-head">
          <p>Paste this into the <code>&lt;head&gt;</code> of your homepage. Use the same organization details you show on the page.</p>
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
        <textarea className="llms-tool-output" value={output} readOnly spellCheck={false} aria-label="Organization JSON-LD" placeholder="Enter a name and website URL to generate your markup." />
        <div className="llms-tool-cta">
          <p>Already published it? Verify it with the <Link href="/tools/schema-checker">schema markup checker</Link>.</p>
          <Link href="/#scanner" className="btn btn-primary">Run a free AEO scan</Link>
        </div>
      </div>
    </div>
  );
}
