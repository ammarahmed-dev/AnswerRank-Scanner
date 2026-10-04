import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import OrganizationSchemaGenerator from "./OrganizationSchemaGenerator";

export const metadata: Metadata = buildPageMetadata({
  title: "Free Organization Schema Generator (JSON-LD) | AEOCheck",
  description:
    "Generate Organization and WebSite JSON-LD with your name, logo and profile links so AI engines can identify your brand. Free, runs in your browser.",
  path: "/tools/organization-schema-generator",
});

const faqs = [
  {
    q: "What is Organization schema?",
    a: "Organization schema is JSON-LD that states who publishes a site: its name, URL, logo and the profiles that belong to it. It gives search and AI systems an explicit identity to attach your pages and brand mentions to.",
  },
  {
    q: "Why does it matter for AI search?",
    a: "AI engines weigh which source they trust and who is behind it. Clear organization markup, consistent with the visible page, removes guesswork about your brand and links it to profiles such as LinkedIn. It does not guarantee citations.",
  },
  {
    q: "What are the sameAs links for?",
    a: "They list official profiles of the same organization, such as LinkedIn, X, GitHub or Crunchbase. Engines use them to confirm they are looking at the same entity across the web.",
  },
  {
    q: "Where do I add the markup?",
    a: "In the head of your homepage, and optionally every page. The details must match what visitors see; do not mark up facts that are not on your site.",
  },
  {
    q: "Is my data sent anywhere?",
    a: "No. The generator runs entirely in your browser and nothing you type is sent to a server.",
  },
];

const schema = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "AEOCheck Organization Schema Generator",
    url: `${SITE_URL}/tools/organization-schema-generator`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Free browser-based tool that generates Organization and WebSite JSON-LD.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

export default function OrganizationSchemaGeneratorPage() {
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SiteHeader />
      <section className="launch-section llms-tool-section">
        <div className="launch-container">
          <div className="section-intro llms-tool-intro">
            <p className="launch-eyebrow">Free tool</p>
            <h1>Organization Schema Generator</h1>
            <p>
              Tell AI engines who you are. Fill in your details and copy valid Organization and WebSite JSON-LD. Runs in
              your browser, nothing is sent to a server.
            </p>
          </div>
          <OrganizationSchemaGenerator />
          <div className="llms-tool-faq">
            <h2>Organization schema questions</h2>
            {faqs.map((f) => (
              <div key={f.q} className="llms-tool-faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
            <p>
              More structured data options: the <Link href="/tools/faq-schema-generator">FAQ schema generator</Link> and the{" "}
              <Link href="/blog/technical-aeo-guide">technical AEO guide</Link>.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
