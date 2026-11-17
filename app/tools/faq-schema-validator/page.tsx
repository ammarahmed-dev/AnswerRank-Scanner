import type { Metadata } from "next";
import Link from "next/link";
import ServiceCta from "@/app/components/ServiceCta";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import SchemaChecker from "../schema-checker/SchemaChecker";

export const metadata: Metadata = buildPageMetadata({
  title: "Free FAQ Schema Checker & Validator | AEOCheck",
  description:
    "Check FAQ schema on any URL. Detect FAQPage JSON-LD, missing questions or answers, and invalid code. Free FAQ schema checker and validator.",
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
    q: "Does FAQ schema still produce Google FAQ rich results?",
    a: "No. Google ended FAQ rich results in Search on May 7, 2026. FAQPage remains a schema.org type for describing visible questions and answers, but this checker does not predict Google search features or AI citations.",
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
            <h1>Free FAQ Schema Checker & Validator</h1>
            <p>
              Paste a page URL to detect FAQPage JSON-LD and check for missing questions, answers or invalid code. Get a focused FAQ result instead of a generic schema report.
            </p>
          </div>
          <SchemaChecker focus="faq" />
          <div className="llms-tool-faq">
            <h2>How to check FAQ schema</h2>
            <p>Paste the public URL of a page containing visible questions and answers. The checker reads JSON-LD blocks and reports whether FAQPage exists and its question and answer fields are present. It does not validate Microdata, RDFa or Google's search feature eligibility.</p>
            <p>Google stopped showing FAQ rich results on May 7, 2026. Keep your FAQ markup accurate if you use it to describe real page content, but do not add it expecting a Google FAQ dropdown. See the <a href="https://developers.google.com/search/updates" target="_blank" rel="noopener noreferrer">Google Search documentation changelog</a> for the announcement.</p>
          </div>
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
              <Link href="/tools/schema-checker">JSON-LD checker</Link>. For help interpreting warnings, see{" "}
              <Link href="/blog/how-to-check-schema-markup">how to check schema markup</Link>.
            </p>
          </div>
        </div>
      </section>
      <section className="launch-section"><div className="launch-container"><ServiceCta /></div></section>
      <SiteFooter />
    </main>
  );
}
