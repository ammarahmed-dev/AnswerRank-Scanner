import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import SchemaChecker from "./SchemaChecker";

export const metadata: Metadata = buildPageMetadata({
  title: "Free Schema Markup Checker (JSON-LD) | AEOCheck",
  description:
    "Check any page's JSON-LD structured data. See which schema types it has, which required properties are missing and what AI engines expect to find. Free, no signup.",
  path: "/tools/schema-checker",
});

const faqs = [
  {
    q: "What does the schema checker look at?",
    a: "It fetches the page, reads every JSON-LD block, tells you whether each one parses, lists the schema.org types it finds and flags missing required and recommended properties for common types like Organization, WebSite, Article, FAQPage, Product and SoftwareApplication.",
  },
  {
    q: "Is this the same as Google's Rich Results Test?",
    a: "No. Google's tools check eligibility for Google rich results. This checker focuses on whether the markup is complete and consistent enough to help AI engines identify who you are and what the page is about. It does not test eligibility for any search feature.",
  },
  {
    q: "Does it read microdata or RDFa?",
    a: "No, only JSON-LD, which is the format Google recommends and the one most sites use. If your markup is in microdata or RDFa, the checker will report that no structured data was found.",
  },
  {
    q: "Why does it say my markup is missing properties?",
    a: "Each schema type has properties that are required for the markup to describe the entity at all and properties that are recommended because they add useful context. Required properties are flagged as problems; recommended ones are suggestions.",
  },
  {
    q: "Is the checker free?",
    a: "Yes. You can check up to 30 pages per month without an account.",
  },
];

const schema = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "AEOCheck Schema Markup Checker",
    url: `${SITE_URL}/tools/schema-checker`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Free tool that inspects a page's JSON-LD structured data and flags missing properties.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

export default function SchemaCheckerPage() {
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SiteHeader />
      <section className="launch-section llms-tool-section">
        <div className="launch-container">
          <div className="section-intro llms-tool-intro">
            <p className="launch-eyebrow">Free tool</p>
            <h1>Schema Markup Checker</h1>
            <p>
              Paste a page URL and see which JSON-LD structured data it has, what is missing and what to add so AI
              engines can tell who you are and what the page covers.
            </p>
          </div>
          <SchemaChecker />
          <div className="llms-tool-faq">
            <h2>Schema checker questions</h2>
            {faqs.map((f) => (
              <div key={f.q} className="llms-tool-faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
            <p>
              Need markup to paste? Build it with the <Link href="/tools/faq-schema-generator">FAQ schema generator</Link>, or read the{" "}
              <Link href="/blog/technical-aeo-guide">technical AEO guide</Link>.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
