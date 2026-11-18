import type { Metadata } from "next";
import Link from "next/link";
import ServiceCta from "@/app/components/ServiceCta";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import SchemaChecker from "./SchemaChecker";

export const metadata: Metadata = buildPageMetadata({
  title: "Free Schema Markup Checker (JSON-LD) | AEOCheck",
  description:
    "Free schema markup checker: inspect JSON-LD on any URL, find schema types and missing properties, and learn how to verify Google rich-result eligibility.",
  path: "/tools/schema-checker",
});

const faqs = [
  {
    q: "How do I check the schema markup on my page?",
    a: "Enter the page URL above. The checker fetches the page, parses each JSON-LD block and lists the schema.org types it found, with selected field-presence checks for common types. Types without a built-in checklist are labelled unassessed. For FAQ-specific question and answer checks, use the linked FAQ schema validator.",
  },
  {
    q: "Is this a JSON-LD validator?",
    a: "It checks JSON syntax and selected fields on common types. It reports how many typed declarations received field checks. It is not a full schema.org validator, so for edge cases also run the Schema.org validator. Use this tool for a fast read on what a page declares and what is missing.",
  },
  {
    q: "What does the schema checker look at?",
    a: "It fetches the page, reads every JSON-LD block, tells you whether each one parses, lists the schema.org types it finds and flags missing fields from this tool's checklists for common types like Organization, WebSite, Article, FAQPage, Product and SoftwareApplication.",
  },
  {
    q: "Is this the same as Google's Rich Results Test?",
    a: "No. Google's tools check eligibility for Google rich results. This checker tests JSON syntax and selected field presence. It does not verify property value types, expand contexts, compare markup with visible content or measure AI inclusion. It does not test eligibility for any search feature.",
  },
  {
    q: "Does it read microdata or RDFa?",
    a: "No, only JSON-LD, which is the format Google recommends and the one most sites use. If your markup is in microdata or RDFa, the checker will report that no JSON-LD blocks were found; other structured data may still exist.",
  },
  {
    q: "Why does it say my markup is missing properties?",
    a: "The tool applies a small field checklist for supported types. Missing checked fields and optional suggestions are review prompts, not universal schema.org requirements. Search features have their own rules; compare the actual page and use the appropriate validator.",
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
            <h1>Free Schema Markup Checker for JSON-LD</h1>
            <p>
              Paste a page URL to inspect JSON-LD syntax, detected types and selected fields. See which declarations
              received field checks and which types still need a broader validator.
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
              Need help interpreting results? Follow the{" "}
              <Link href="/blog/how-to-check-schema-markup">step-by-step schema markup checking guide</Link>, build FAQ markup with the{" "}
              <Link href="/tools/faq-schema-generator">FAQ schema generator</Link>, or learn about the{" "}
              <Link href="/blog/technical-aeo-guide">technical AEO fundamentals</Link>.
            </p>
          </div>
        </div>
      </section>
      <section className="launch-section"><div className="launch-container"><ServiceCta /></div></section>
      <SiteFooter />
    </main>
  );
}
