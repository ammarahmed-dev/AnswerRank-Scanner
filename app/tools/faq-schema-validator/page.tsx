import type { Metadata } from "next";
import Link from "next/link";
import ServiceCta from "@/app/components/ServiceCta";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import SchemaChecker from "../schema-checker/SchemaChecker";

export const metadata: Metadata = buildPageMetadata({
  title: "Free FAQ Schema Validator: Check Your FAQPage Markup | AEOCheck",
  description:
    "Validate FAQPage structured data on any page. See whether your FAQ schema parses, which questions it lists and which required properties are missing. Free, no signup.",
  path: "/tools/faq-schema-validator",
});

const faqs = [
  {
    q: "How do I validate my FAQ schema?",
    a: "Enter the page URL above. The tool fetches the page, parses every JSON-LD block and lists the types it finds. For FAQPage it checks that the markup parses and that the required properties are present, so you can see whether your FAQ schema is detected and complete.",
  },
  {
    q: "What does valid FAQPage markup need?",
    a: "A FAQPage object with a mainEntity list. Each item is a Question with a name and an acceptedAnswer of type Answer containing the answer text. The questions and answers must also appear on the page itself.",
  },
  {
    q: "Will FAQ schema give me a Google rich result?",
    a: "Not necessarily. Google has limited FAQ rich results to a small set of authoritative sites, so most pages will not see an expandable FAQ in search. FAQ markup can still help machines understand the question and answer pairs on the page. This tool does not test eligibility for any search feature.",
  },
  {
    q: "Is this a full schema.org validator?",
    a: "No. It checks that each JSON-LD block parses and that common types have their key properties. For edge cases also run the Schema.org validator.",
  },
  {
    q: "Is the validator free?",
    a: "Yes. You can check up to 30 pages per month without an account.",
  },
];

const schema = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "AEOCheck FAQ Schema Validator",
    url: `${SITE_URL}/tools/faq-schema-validator`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Free tool that validates FAQPage structured data on a page.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

export default function FaqSchemaValidatorPage() {
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SiteHeader />
      <section className="launch-section llms-tool-section">
        <div className="launch-container">
          <div className="section-intro llms-tool-intro">
            <p className="launch-eyebrow">Free tool</p>
            <h1>FAQ Schema Validator</h1>
            <p>
              Paste a page URL to see whether it has valid FAQPage markup, which questions it lists and what is missing.
            </p>
          </div>
          <SchemaChecker />
          <div className="llms-tool-faq">
            <h2>FAQ schema questions</h2>
            {faqs.map((f) => (
              <div key={f.q} className="llms-tool-faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
            <p>
              No FAQ markup yet? Build it with the <Link href="/tools/faq-schema-generator">FAQ schema generator</Link>. To inspect every schema type on a page, use the{" "}
              <Link href="/tools/schema-checker">JSON-LD checker</Link>.
            </p>
          </div>
        </div>
      </section>
      <section className="launch-section"><div className="launch-container"><ServiceCta /></div></section>
      <SiteFooter />
    </main>
  );
}
