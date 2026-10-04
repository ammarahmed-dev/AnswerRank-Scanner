import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Free AI SEO Audit: Is Your Site Ready for AI Search? | AEOCheck",
  description:
    "Free AI SEO audit: scan any URL for 25 checks that decide whether ChatGPT, Perplexity and Google AI Overviews can read, trust and cite your page. Score and fixes in 60 seconds.",
  path: "/ai-seo-audit",
});

const GROUPS = [
  {
    name: "Crawl access",
    text: "Does robots.txt let AI crawlers in, is there a sitemap, is HTTPS on, is the canonical clean, and do you publish llms.txt?",
    tool: { href: "/tools/ai-crawler-checker", label: "AI Crawler Checker" },
  },
  {
    name: "Structured data",
    text: "Is there JSON-LD, FAQ and Article markup, and how dense is the structure (lists, tables, headings) that machines parse?",
    tool: { href: "/tools/schema-checker", label: "Schema Markup Checker" },
  },
  {
    name: "Metadata",
    text: "Title, meta description, H1, Open Graph tags and image: the first things any system reads about a page.",
    tool: { href: "/tools/meta-tag-checker", label: "Meta Tag Checker" },
  },
  {
    name: "Content you can quote",
    text: "Word count, readability, question-and-answer structure and answer-first headings that make passages easy to lift.",
    tool: { href: "/tools/content-extractability", label: "Content Extractability Checker" },
  },
  {
    name: "Trust signals",
    text: "Named author, an about page and freshness dates: the evidence that a source is worth citing.",
    tool: { href: "/blog/why-chatgpt-is-not-citing-your-website", label: "Why AI is not citing you" },
  },
  {
    name: "Performance",
    text: "Core Web Vitals from the public PageSpeed data, since slow pages are harder to fetch and render.",
    tool: { href: "/blog/technical-aeo-guide", label: "Technical AEO guide" },
  },
];

const faqs = [
  {
    q: "What is an AI SEO audit?",
    a: "An AI SEO audit checks whether a page has the technical and content signals that AI search systems use to find, understand and cite it: crawler access, structured data, metadata, quotable content and trust signals. It complements a classic SEO audit rather than replacing it.",
  },
  {
    q: "How is it different from a normal SEO audit?",
    a: "A classic audit focuses on rankings in a list of links. This one focuses on whether an AI system can fetch the page, extract a clear answer from it and attribute that answer to you, for example by allowing AI crawlers and marking up your content.",
  },
  {
    q: "Does a high score guarantee that ChatGPT will cite me?",
    a: "No. Nobody can guarantee citations. The score measures readiness: it removes the technical reasons an AI system might skip your page. Whether you get cited also depends on how relevant and authoritative your content is.",
  },
  {
    q: "Is the audit free?",
    a: "Yes. The scan, the score and the list of issues are free with no signup. Paid plans add the full prioritized report, monitoring and PDF exports.",
  },
];

const schema = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "AEOCheck AI SEO Audit",
    url: `${SITE_URL}/ai-seo-audit`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Free audit that scores a URL on 25 signals for AI search visibility.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

export default function AiSeoAuditPage() {
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SiteHeader />
      <section className="launch-section llms-tool-section">
        <div className="launch-container">
          <div className="section-intro llms-tool-intro">
            <p className="launch-eyebrow">AI SEO audit</p>
            <h1>Free AI SEO Audit</h1>
            <p>
              Find out why AI search may be skipping your site. Paste a URL and get a score across 25 checks, with
              prioritized fixes, in about a minute. No signup.
            </p>
            <p>
              <Link href="/#scanner" className="btn btn-primary">Run the free audit</Link>
            </p>
          </div>
          <div className="tools-grid">
            {GROUPS.map((g) => (
              <div key={g.name} className="surface tools-card">
                <h2>{g.name}</h2>
                <p>{g.text}</p>
                <p>
                  <Link href={g.tool.href} style={{ color: "var(--color-primary)", fontWeight: 700 }}>{g.tool.label} →</Link>
                </p>
              </div>
            ))}
          </div>
          <div className="llms-tool-faq">
            <h2>AI SEO audit questions</h2>
            {faqs.map((f) => (
              <div key={f.q} className="llms-tool-faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
            <p>
              See what the result looks like in the <Link href="/sample-report">sample report</Link>, compare plans on{" "}
              <Link href="/pricing">pricing</Link> or browse all <Link href="/tools">free tools</Link>.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
