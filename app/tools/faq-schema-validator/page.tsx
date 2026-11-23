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
    a: "Enter the page URL above. The tool fetches the page, parses JSON-LD blocks in the fetched page and lists the types it finds. For FAQPage it checks selected question and answer fields. A passing field check does not establish full schema.org validity or agreement with the visible page.",
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
    q: "Can I paste FAQ schema code into this checker?",
    a: "This checker accepts a public page URL, not pasted code. For unpublished JSON-LD, use Schema Markup Validator to test the markup directly. After publishing, check the deployed URL and compare its questions and answers with the visible page.",
  },
  {
    q: "Why is FAQ schema missing when I can see an FAQ on the page?",
    a: "Visible FAQ text does not automatically create FAQPage JSON-LD. Check the page source for an application/ld+json script and confirm the correct URL was published. This tool does not execute page JavaScript, so markup added only after scripts run may be absent from its fetched HTML.",
  },
  {
    q: "Is the validator free?",
    a: "Yes. You can check up to 30 pages per month without an account.",
  },
];

const example = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [{
    "@type": "Question",
    name: "What should I do after updating FAQ markup?",
    acceptedAnswer: {
      "@type": "Answer",
      text: "Publish the page, then test its public URL again.",
    },
  }],
};
const exampleMarkup = `<script type="application/ld+json">\n${JSON.stringify(example, null, 2)}\n</script>`;

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
            <p>Paste the public URL of a page containing visible questions and answers. The checker reads JSON-LD blocks and reports whether FAQPage exists and its question and answer fields are present. It does not validate Microdata, RDFa or Google search feature eligibility.</p>
            <p>Google stopped showing FAQ rich results on May 7, 2026. Keep your FAQ markup accurate if you use it to describe real page content, but do not add it expecting a Google FAQ dropdown. See the <a href="https://developers.google.com/search/updates" target="_blank" rel="noopener noreferrer">Google Search documentation changelog</a> for the announcement.</p>
          </div>
          <section className="llms-tool-faq" aria-labelledby="faq-example-heading">
            <h2 id="faq-example-heading">FAQPage JSON-LD example</h2>
            <p>Use this illustrative one-question example to understand the structure. Replace the question and answer with your own visible content before adding it to a page.</p>
            <div className="faq-worked-copy">
              <h3>{example.mainEntity[0].name}</h3>
              <p>{example.mainEntity[0].acceptedAnswer.text}</p>
            </div>
            <pre className="report-code-block" aria-label="Illustrative FAQPage JSON-LD"><code>{exampleMarkup}</code></pre>
            <p><code>mainEntity</code> holds the questions; each <code>Question</code> has a <code>name</code> and an <code>acceptedAnswer</code> with <code>text</code>. Compare the code with the <a href="https://schema.org/FAQPage" target="_blank" rel="noopener noreferrer">FAQPage vocabulary</a>. Code displayed here is an example, not a second FAQ declaration on this page.</p>
            <p>Need your own markup? Use the <Link href="/tools/faq-schema-generator">FAQ schema generator</Link>, or test unpublished code in <a href="https://validator.schema.org/" target="_blank" rel="noopener noreferrer">Schema Markup Validator</a>. Then publish and recheck the exact page URL above.</p>
          </section>
          <section className="llms-tool-faq" aria-labelledby="faq-next-heading">
            <h2 id="faq-next-heading">What should I fix after a FAQ schema check?</h2>
            <div className="llms-tool-faq-item">
              <h3>No FAQPage found</h3>
              <p>If the page really contains FAQ content, add matching FAQPage JSON-LD with the generator. An Organization or Article declaration alone does not describe those questions. Check the published HTML; this tool does not execute page JavaScript or inspect Microdata/RDFa.</p>
            </div>
            <div className="llms-tool-faq-item">
              <h3>JSON-LD syntax errors</h3>
              <p>Inspect the reported block for trailing commas, unmatched brackets or unescaped quotation marks. Correct the source template, deploy it and recheck; adding another valid block does not fix a malformed one.</p>
            </div>
            <div className="llms-tool-faq-item">
              <h3>Question or answer fields missing</h3>
              <p>Review <code>mainEntity</code> and each question&apos;s <code>name</code>, <code>acceptedAnswer</code> and answer <code>text</code>. Use Question and Answer types as in the example. This tool checks selected field presence, not every property or type relationship.</p>
            </div>
            <div className="llms-tool-faq-item">
              <h3>Checked fields present</h3>
              <p>Compare every marked-up question and answer with the visible content yourself, and use Schema Markup Validator for broader checks. A local pass does not prove content accuracy, indexing, a Google search feature or an AI citation. For the wider site checks, <Link href="/#scanner">run a free AEO scan</Link>.</p>
            </div>
          </section>
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
