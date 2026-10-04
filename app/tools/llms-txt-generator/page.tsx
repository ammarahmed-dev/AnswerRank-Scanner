import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import LlmsTxtGenerator from "./LlmsTxtGenerator";

export const metadata: Metadata = buildPageMetadata({
  title: "Free llms.txt Generator | AEOCheck",
  description:
    "Generate an llms.txt file for your website in seconds. Free tool that reads your key pages and writes a clean llms.txt that AI engines can use.",
  path: "/tools/llms-txt-generator",
});

const faqs = [
  {
    q: "What is llms.txt?",
    a: "llms.txt is a plain Markdown file at the root of your domain (yourdomain.com/llms.txt) that tells large language models what your site is about and which pages matter most. It is a proposed standard described at llmstxt.org.",
  },
  {
    q: "Do AI engines use llms.txt?",
    a: "Support is still emerging and varies by engine. Adding the file is cheap, does not affect your search rankings and gives AI systems an authoritative summary of your site in your own words.",
  },
  {
    q: "How does this generator work?",
    a: "It reads your homepage and up to 11 key pages found through your sitemap and internal links, then writes an llms.txt with your site name, a summary from your meta description, and grouped links with descriptions. Edit the result before publishing.",
  },
  {
    q: "Where do I put the file?",
    a: "Upload it so it is reachable at https://yourdomain.com/llms.txt and served as plain text. On most platforms you can add it as a static file in the site root.",
  },
  {
    q: "Is the tool free?",
    a: "Yes. You can generate up to 10 llms.txt files per month without an account.",
  },
];

const schema = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "AEOCheck llms.txt Generator",
    url: `${SITE_URL}/tools/llms-txt-generator`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Free tool that generates an llms.txt file from your website's key pages.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

export default function LlmsTxtGeneratorPage() {
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SiteHeader />
      <section className="launch-section llms-tool-section">
        <div className="launch-container">
          <div className="section-intro llms-tool-intro">
            <p className="launch-eyebrow">Free tool</p>
            <h1>llms.txt Generator</h1>
            <p>
              Enter your website and get a ready-to-edit llms.txt file built from your real pages. Give AI
              engines like ChatGPT, Claude and Perplexity a clear summary of what you do and where to find it.
            </p>
          </div>
          <LlmsTxtGenerator />
          <div className="llms-tool-faq">
            <h2>llms.txt questions</h2>
            {faqs.map((f) => (
              <div key={f.q} className="llms-tool-faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
            <p>
              Learn how llms.txt fits with robots.txt, schema and the rest of the technical checklist in our{" "}
              <Link href="/blog/technical-aeo-guide">technical AEO guide</Link>.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
