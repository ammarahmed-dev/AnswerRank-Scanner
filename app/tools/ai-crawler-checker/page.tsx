import type { Metadata } from "next";
import Link from "next/link";
import ServiceCta from "@/app/components/ServiceCta";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import AiCrawlerChecker from "./AiCrawlerChecker";

export const metadata: Metadata = buildPageMetadata({
  title: "Free AI Crawler Checker: Is GPTBot Blocked? | AEOCheck",
  description:
    "Check whether your robots.txt allows GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot and Google-Extended. Free tool with a clear allowed or blocked result for each AI crawler.",
  path: "/tools/ai-crawler-checker",
});

// Illustrative policy only. This is displayed as text, never served as robots.txt.
const examplePolicy = `User-agent: *
Disallow: /private/
Disallow: /api/

User-agent: OAI-SearchBot
Allow: /
Disallow: /private/
Disallow: /api/

User-agent: GPTBot
Disallow: /`;

const exampleCases = [
  { agent: "OAI-SearchBot", path: "/products/lamp", allowed: true },
  { agent: "GPTBot", path: "/products/lamp", allowed: false },
  { agent: "OAI-SearchBot", path: "/private/draft", allowed: false },
  { agent: "PerplexityBot", path: "/api/orders", allowed: false },
];

const faqs = [
  {
    q: "How do I know if GPTBot is blocked on my site?",
    a: "Enter a page URL above. The checker tests robots.txt rules for its path and query, including grouped User-agent lines, wildcards and end anchors. It does not fetch the page, resolve its redirects or verify that a crawler visited it.",
  },
  {
    q: "What is the difference between GPTBot and OAI-SearchBot?",
    a: "GPTBot is OpenAI's training crawler; its robots preference is independent of OAI-SearchBot, which is used for ChatGPT search. Disallowing OAI-SearchBot opts out of ChatGPT search answers, though navigational links may remain. Allowing it does not prove that your page appears or is cited.",
  },
  {
    q: "Will blocking Google-Extended hide me from AI Overviews?",
    a: "No. Google-Extended controls Gemini training and specified grounding uses in Gemini Apps and Vertex AI. It does not control Google Search inclusion or ranking; Googlebot crawl preferences apply to Google Search features.",
  },
  {
    q: "Does this tool see firewall or CDN blocks?",
    a: "No. It only evaluates your robots.txt rules. A firewall or bot-protection rule can still block AI crawlers that robots.txt allows, so check those settings too.",
  },
  {
    q: "Can I allow ChatGPT search while blocking GPTBot?",
    a: "Yes. OpenAI treats OAI-SearchBot search access and GPTBot training preferences independently. A specific crawler group does not inherit the wildcard group's exclusions, so retain needed restrictions in that group too. Robots rules do not enforce private access or guarantee search inclusion.",
  },
  {
    q: "Is the checker free?",
    a: "Yes. You can run up to 30 checks per month without an account.",
  },
];

const schema = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "AEOCheck AI Crawler Checker",
    url: `${SITE_URL}/tools/ai-crawler-checker`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Free tool that checks which AI crawlers a website's robots.txt allows or blocks.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

export default function AiCrawlerCheckerPage() {
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SiteHeader />
      <section className="launch-section llms-tool-section">
        <div className="launch-container">
          <div className="section-intro llms-tool-intro">
            <p className="launch-eyebrow">Free tool</p>
            <h1>AI Crawler Checker</h1>
            <p>
              Test robots.txt rules for a specific page. Check GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot,
              Google-Extended and more, grouped by search, training/reuse and user-triggered purposes.
            </p>
          </div>
          <AiCrawlerChecker />
          <section className="llms-tool-faq" aria-labelledby="crawler-example-heading">
            <h2 id="crawler-example-heading">Example: allow search, restrict training</h2>
            <p>
              This illustrative policy permits OAI-SearchBot on public pages while disallowing GPTBot.
              It keeps the example private and API paths excluded for search and wildcard crawlers.
              Review and merge any changes with your current policy; do not replace your file with this example.
              Other paths and named crawler groups may need their own rules.
            </p>
            <pre className="report-code-block" aria-label="Illustrative search and training robots policy"><code>{examplePolicy}</code></pre>
            <p>
              Expected rule findings for this example, not observations of crawler visits:
            </p>
            <ul aria-label="Expected example policy findings">
              {exampleCases.map((item) => (
                <li key={`${item.agent}:${item.path}`} data-agent={item.agent} data-path={item.path} data-allowed={String(item.allowed)}>
                  <strong>{item.agent}</strong> on <code>{item.path}</code>: {item.allowed ? "allowed by these rules" : "disallowed by these rules"}.
                </li>
              ))}
            </ul>
            <p>
              The OAI-SearchBot group repeats exclusions because a named group does not inherit the wildcard rules.
              See the <a href="https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec" target="_blank" rel="noopener noreferrer">robots group-selection reference</a>.
              OpenAI documents its independent search and training controls in the <a href="https://developers.openai.com/api/docs/bots" target="_blank" rel="noopener noreferrer">OpenAI crawler reference</a>.
            </p>
            <p>
              Robots.txt is a voluntary crawl policy, not authentication. Protect private content with actual access controls.
              User-triggered requests such as ChatGPT-User may not follow robots rules. These examples do not prove access,
              indexing, training-data removal or AI citations. See the <a href="https://www.rfc-editor.org/rfc/rfc9309.html#section-3" target="_blank" rel="noopener noreferrer">protocol security considerations</a>.
            </p>
          </section>
          <section className="llms-tool-faq" aria-labelledby="crawler-repair-heading">
            <h2 id="crawler-repair-heading">What should I do after a crawler check?</h2>
            <div className="llms-tool-faq-item">
              <h3>A search crawler is disallowed</h3>
              <p>Check the tested page path and the matching rule. If the restriction is intentional, keep it. If you want that public page considered for search, review the smallest rule change with your site team while preserving private-path exclusions. Recheck the same URL after publishing.</p>
            </div>
            <div className="llms-tool-faq-item">
              <h3>A training or reuse crawler is disallowed</h3>
              <p>This can be an intentional preference, not a search outage. Review the crawler&apos;s purpose before changing it. Do not open every bot group just to make all rows look allowed.</p>
            </div>
            <div className="llms-tool-faq-item">
              <h3>The rule allows a crawler</h3>
              <p>Separately check redirects, firewall/CDN events and the response to verified crawler traffic. A browser visit or a request with a copied User-Agent does not prove that a genuine crawler can reach the content. This tool does not perform that verification.</p>
            </div>
            <div className="llms-tool-faq-item">
              <h3>The policy is unavailable or absent</h3>
              <p>An unavailable fetch is unknown: inspect the displayed error and your server&apos;s robots.txt response, then retry after fixing it. Do not replace a policy based on an unread response. HTTP 404 means no robots file was found; the default rule finding is not proof that other access or indexing requirements pass.</p>
            </div>
            <p>
              Continue with a <Link href="/#scanner">page readiness scan</Link> for broader checks, or <Link href="/sample-report">inspect sample readiness findings</Link> before scanning.
              Actual inclusion needs separate observations; use the <Link href="/blog/how-to-check-if-website-appears-in-chatgpt-recommendations">ChatGPT measurement guide</Link>.
            </p>
          </section>
          <div className="llms-tool-faq">
            <h2>AI crawler questions</h2>
            {faqs.map((f) => (
              <div key={f.q} className="llms-tool-faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
            <p>
              Full guide: <Link href="/blog/robots-txt-ai-crawlers">robots.txt for AI crawlers</Link>, part of the{" "}
              <Link href="/blog/technical-aeo-guide">technical AEO guide</Link>.
            </p>
          </div>
        </div>
      </section>
      <section className="launch-section"><div className="launch-container"><ServiceCta /></div></section>
      <SiteFooter />
    </main>
  );
}
