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
