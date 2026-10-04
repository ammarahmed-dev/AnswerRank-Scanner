import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import FaqSchemaGenerator from "./FaqSchemaGenerator";

export const metadata: Metadata = buildPageMetadata({
  title: "Free FAQ Schema Generator (FAQPage JSON-LD) | AEOCheck",
  description:
    "Turn your questions and answers into valid FAQPage JSON-LD in seconds. Free FAQ schema generator that runs in your browser: copy the markup straight into your page.",
  path: "/tools/faq-schema-generator",
});

const faqs = [
  {
    q: "What is FAQ schema?",
    a: "FAQ schema is FAQPage structured data in JSON-LD. It labels each question and answer on a page so search and AI systems can read them as explicit facts instead of guessing from the layout.",
  },
  {
    q: "Does FAQ schema help with AI search?",
    a: "It removes ambiguity about which questions your page answers, which makes the answers easier to extract and cite. It is not a guarantee of citation, and the answers also need to be visible on the page.",
  },
  {
    q: "Does Google still show FAQ rich results?",
    a: "Google now limits FAQ rich results in Search to a small set of authoritative sites. The markup is still valid schema.org data and still helps machines understand the page, but do not expect an expanded FAQ snippet.",
  },
  {
    q: "Where do I add the markup?",
    a: "Paste the script tag into the page that displays the same questions and answers, in the head or the body. The markup must match visible content; do not mark up questions that are not on the page.",
  },
  {
    q: "Is my content sent anywhere?",
    a: "No. The generator runs entirely in your browser. Nothing you type is sent to a server.",
  },
];

const schema = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "AEOCheck FAQ Schema Generator",
    url: `${SITE_URL}/tools/faq-schema-generator`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Free browser-based tool that generates FAQPage JSON-LD from your questions and answers.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

export default function FaqSchemaGeneratorPage() {
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SiteHeader />
      <section className="launch-section llms-tool-section">
        <div className="launch-container">
          <div className="section-intro llms-tool-intro">
            <p className="launch-eyebrow">Free tool</p>
            <h1>FAQ Schema Generator</h1>
            <p>
              Write your questions and answers, copy valid FAQPage JSON-LD. Runs in your browser, no signup,
              nothing is sent to a server.
            </p>
          </div>
          <FaqSchemaGenerator />
          <div className="llms-tool-faq">
            <h2>FAQ schema questions</h2>
            {faqs.map((f) => (
              <div key={f.q} className="llms-tool-faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
            <p>
              Structured data is one part of the <Link href="/blog/technical-aeo-guide">technical AEO guide</Link>.
              To see whether your page already has FAQ markup, <Link href="/#scanner">run a free scan</Link>.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
