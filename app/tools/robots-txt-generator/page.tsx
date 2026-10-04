import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import RobotsTxtGenerator from "./RobotsTxtGenerator";

export const metadata: Metadata = buildPageMetadata({
  title: "Free robots.txt Generator for AI Crawlers | AEOCheck",
  description:
    "Generate a robots.txt for GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot and Google-Extended. Pick a policy, copy the file. Free, runs in your browser.",
  path: "/tools/robots-txt-generator",
});

const faqs = [
  {
    q: "How do I allow ChatGPT and Perplexity but block AI training?",
    a: "Choose \"Visible in AI search, no training\". It allows OAI-SearchBot, PerplexityBot and Claude-SearchBot, which decide whether you appear in AI answers, and blocks GPTBot, ClaudeBot, Google-Extended and the other training crawlers.",
  },
  {
    q: "Will blocking GPTBot remove me from ChatGPT?",
    a: "No. GPTBot is OpenAI's training crawler. ChatGPT search uses OAI-SearchBot, so you can block GPTBot and still be cited. Blocking OAI-SearchBot is what removes you from ChatGPT search.",
  },
  {
    q: "Does blocking Google-Extended affect Google rankings or AI Overviews?",
    a: "No. Google-Extended only controls use of your content for Gemini training and grounding in Gemini apps. AI Overviews in Google Search use the regular Googlebot crawl.",
  },
  {
    q: "Where does the file go?",
    a: "At the root of your domain, reachable at https://yourdomain.com/robots.txt. If you already have rules for other crawlers, keep them and add the AI crawler groups from the generated file.",
  },
  {
    q: "Does robots.txt stop every bot?",
    a: "No. It is a request that well-behaved crawlers follow. User-triggered agents such as ChatGPT-User and Perplexity-User fetch pages on a person's behalf and vendors say robots.txt may not apply to them. A firewall rule is needed to enforce a block.",
  },
  {
    q: "Is the generator free?",
    a: "Yes. It runs entirely in your browser and nothing you enter is sent to a server.",
  },
];

const schema = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "AEOCheck robots.txt Generator for AI Crawlers",
    url: `${SITE_URL}/tools/robots-txt-generator`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Free browser-based tool that generates a robots.txt with an explicit policy for AI crawlers.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

export default function RobotsTxtGeneratorPage() {
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SiteHeader />
      <section className="launch-section llms-tool-section">
        <div className="launch-container">
          <div className="section-intro llms-tool-intro">
            <p className="launch-eyebrow">Free tool</p>
            <h1>robots.txt Generator for AI Crawlers</h1>
            <p>
              Choose how GPTBot, OAI-SearchBot, PerplexityBot, ClaudeBot and Google-Extended may use your site and copy
              a ready robots.txt. Runs in your browser, nothing is sent to a server.
            </p>
          </div>
          <RobotsTxtGenerator />
          <div className="llms-tool-faq">
            <h2>robots.txt questions</h2>
            {faqs.map((f) => (
              <div key={f.q} className="llms-tool-faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
            <p>
              The full reasoning is in <Link href="/blog/robots-txt-ai-crawlers">robots.txt for AI crawlers</Link>, part of the{" "}
              <Link href="/blog/technical-aeo-guide">technical AEO guide</Link>.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
