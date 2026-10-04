"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download } from "lucide-react";
import { AI_CRAWLERS, AI_SEARCH_CRAWLERS, AI_TRAINING_CRAWLERS } from "@/lib/robots";
import { buildRobotsTxt, choicesFor, CRAWLER_TOKENS, robotsWarnings, type CrawlerChoice, type RobotsPolicy } from "@/lib/robots-generator";

const POLICIES: Array<{ id: RobotsPolicy; title: string; text: string }> = [
  { id: "search_only", title: "Visible in AI search, no training", text: "Allow ChatGPT, Perplexity and Claude search; block model-training crawlers. The usual choice for publishers." },
  { id: "open", title: "Allow all AI crawlers", text: "Maximum visibility. Every AI crawler is explicitly allowed." },
  { id: "block_all", title: "Block all AI crawlers", text: "Opt out of AI search and training. Your site will not appear in AI answers." },
  { id: "custom", title: "Choose per crawler", text: "Set allow or block for each crawler yourself." },
];

const KIND = (token: string) => (AI_SEARCH_CRAWLERS.includes(token) ? "Search" : AI_TRAINING_CRAWLERS.includes(token) ? "Training" : "User agent");

export default function RobotsTxtGenerator() {
  const [policy, setPolicy] = useState<RobotsPolicy>("search_only");
  const [custom, setCustom] = useState<Record<string, CrawlerChoice>>({});
  const [sitemap, setSitemap] = useState("");
  const [paths, setPaths] = useState("");
  const [copied, setCopied] = useState(false);

  const options = useMemo(
    () => ({ policy, custom: policy === "custom" ? custom : undefined, sitemapUrl: sitemap, disallowPaths: paths.split("\n") }),
    [policy, custom, sitemap, paths]
  );
  const output = useMemo(() => buildRobotsTxt(options), [options]);
  const warnings = useMemo(() => robotsWarnings(options), [options]);
  const choices = choicesFor(policy, custom);

  function toggle(token: string) {
    setCustom((prev) => ({ ...prev, [token]: (prev[token] ?? "allow") === "allow" ? "block" : "allow" }));
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
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "robots.txt";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div className="surface llms-tool">
      <fieldset className="robots-policy">
        <legend>AI crawler policy</legend>
        {POLICIES.map((p) => (
          <label key={p.id} className={`robots-policy-card${policy === p.id ? " is-selected" : ""}`}>
            <input type="radio" name="policy" value={p.id} checked={policy === p.id} onChange={() => setPolicy(p.id)} />
            <strong>{p.title}</strong>
            <span>{p.text}</span>
          </label>
        ))}
      </fieldset>

      {policy === "custom" && (
        <ul className="extract-list robots-custom">
          {CRAWLER_TOKENS.map((token) => (
            <li key={token} className={choices[token] === "allow" ? "is-allowed" : "is-blocked"}>
              <div className="extract-head">
                <strong>{AI_CRAWLERS[token]}</strong>
                <span>{KIND(token)}</span>
                <button type="button" className="btn btn-secondary robots-toggle" onClick={() => toggle(token)} aria-pressed={choices[token] === "block"}>
                  {choices[token] === "allow" ? "Allowed" : "Blocked"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="vis-form-row robots-fields">
        <input type="text" placeholder="https://yourdomain.com/sitemap.xml (optional)" aria-label="Sitemap URL" value={sitemap} onChange={(e) => setSitemap(e.target.value)} />
        <textarea className="vis-prompts" rows={3} placeholder={"Paths to keep everyone out of, one per line (optional)\n/admin\n/cart"} aria-label="Disallowed paths" value={paths} onChange={(e) => setPaths(e.target.value)} />
      </div>

      <div className="llms-tool-result">
        <div className="llms-tool-result-head">
          <p>Save this as <code>robots.txt</code> at your domain root (<code>/robots.txt</code>), replacing the file you have or merging the AI crawler groups into it.</p>
          <div className="llms-tool-actions">
            <button type="button" className="btn btn-secondary" onClick={copy}>
              {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
            </button>
            <button type="button" className="btn btn-secondary" onClick={download}>
              <Download className="h-4 w-4" /> Download
            </button>
          </div>
        </div>
        {warnings.length > 0 && (
          <ul className="faq-tool-warnings" aria-live="polite">
            {warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        )}
        <textarea className="llms-tool-output" value={output} readOnly spellCheck={false} aria-label="Generated robots.txt" />
        <div className="llms-tool-cta">
          <p>Already have a robots.txt? See what it allows today with the <Link href="/tools/ai-crawler-checker">AI crawler checker</Link>.</p>
          <Link href="/#scanner" className="btn btn-primary">Run a free AEO scan</Link>
        </div>
      </div>
    </div>
  );
}
