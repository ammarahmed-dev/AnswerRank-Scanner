import type { Metadata } from "next";
import Link from "next/link";
import ServiceCta from "@/app/components/ServiceCta";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import MetaTagChecker from "../meta-tag-checker/MetaTagChecker";

export const metadata: Metadata = buildPageMetadata({
  title: "Free Canonical Tag Checker | AEOCheck",
  description:
    "Check a page's canonical tag: see the canonical URL, whether it is missing and whether it matches og:url. Free.",
  path: "/tools/canonical-tag-checker",
});

const faqs = [
  {
    q: "How do I check a canonical tag?",
    a: "Enter a page URL above. The checker reads the rel=canonical link in the page head, shows the canonical URL and flags a missing tag and a canonical that disagrees with og:url.",
  },
  {
    q: "What is a canonical tag?",
    a: "A canonical tag is a link element in the page head, <link rel=\"canonical\" href=\"...\">, that tells search engines and AI crawlers which URL is the preferred version of a page when the same content is reachable at several URLs.",
  },
  {
    q: "Should every page have a canonical tag?",
    a: "Yes. A self-referencing canonical on every indexable page is a safe default. It prevents tracking parameters, trailing-slash and www variants from being treated as separate pages.",
  },
  {
    q: "Should the canonical be an absolute or relative URL?",
    a: "Use an absolute https URL. Relative canonicals are valid but easy to get wrong, so check the URL shown by the checker is complete.",
  },
  {
    q: "Is the checker free?",
    a: "Yes. You can run up to 30 checks per month without an account.",
  },
];

const schema = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "AEOCheck Canonical Tag Checker",
    url: `${SITE_URL}/tools/canonical-tag-checker`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Free tool that checks a page's canonical tag and flags missing or conflicting canonical URLs.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

export default function CanonicalTagCheckerPage() {
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SiteHeader />
      <section className="launch-section llms-tool-section">
        <div className="launch-container">
          <div className="section-intro llms-tool-intro">
            <p className="launch-eyebrow">Free tool</p>
            <h1>Canonical Tag Checker</h1>
            <p>Check a page&apos;s canonical tag and see which URL search engines and AI crawlers are told to treat as the original.</p>
          </div>
          <MetaTagChecker />
          <div className="llms-tool-faq">
            <h2>Canonical tag questions</h2>
            {faqs.map((f) => (
              <div key={f.q} className="llms-tool-faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
            <p>
              Need the full picture? Run the <Link href="/tools/meta-tag-checker">meta tag checker</Link> for title, description and social tags too, or read the{" "}
              <Link href="/blog/technical-aeo-guide">technical AEO guide</Link>.
            </p>
          </div>
        </div>
      </section>
      <section className="launch-section"><div className="launch-container"><ServiceCta /></div></section>
      <SiteFooter />
    </main>
  );
}
