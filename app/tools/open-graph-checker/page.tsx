import type { Metadata } from "next";
import Link from "next/link";
import ServiceCta from "@/app/components/ServiceCta";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import MetaTagChecker from "../meta-tag-checker/MetaTagChecker";

export const metadata: Metadata = buildPageMetadata({
  title: "Free Open Graph Checker and Social Preview | AEOCheck",
  description:
    "Check a page's Open Graph and Twitter card tags and preview how it looks when shared on Facebook, LinkedIn, X and Slack. See missing og:image, title and description. Free.",
  path: "/tools/open-graph-checker",
});

const faqs = [
  {
    q: "How do I check my Open Graph tags?",
    a: "Enter a page URL above. The checker reads og:title, og:description, og:image and og:url plus the Twitter card tags, shows a live social card preview and flags what is missing, too long or inconsistent with the canonical URL.",
  },
  {
    q: "Which Open Graph tags are required?",
    a: "The four core tags are og:title, og:type, og:image and og:url. In practice og:description is also worth setting, and the image should be an absolute URL. Twitter and X fall back to Open Graph tags when twitter:card is set.",
  },
  {
    q: "What size should my og:image be?",
    a: "A 1200 by 630 pixel image (about 1.91:1) works well across Facebook, LinkedIn, X and Slack. Keep the file small and use an absolute https URL so platforms can fetch it.",
  },
  {
    q: "Why does a shared link still show an old image?",
    a: "Social platforms cache link previews. After fixing your tags, re-scrape the URL with the platform's own debugger tool or wait for the cache to expire. This tool always reads the live page.",
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
    name: "AEOCheck Open Graph Checker",
    url: `${SITE_URL}/tools/open-graph-checker`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Free tool that checks a page's Open Graph and Twitter card tags and previews the social card.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

export default function OpenGraphCheckerPage() {
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SiteHeader />
      <section className="launch-section llms-tool-section">
        <div className="launch-container">
          <div className="section-intro llms-tool-intro">
            <p className="launch-eyebrow">Free tool</p>
            <h1>Open Graph Checker and Social Preview</h1>
            <p>Check a page&apos;s Open Graph and Twitter card tags and see how the link looks when it is shared, with a live social card preview.</p>
          </div>
          <MetaTagChecker />
          <div className="llms-tool-faq">
            <h2>Open Graph questions</h2>
            {faqs.map((f) => (
              <div key={f.q} className="llms-tool-faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
            <p>
              Need the full picture? Run the <Link href="/tools/meta-tag-checker">meta tag checker</Link> for title, description and canonical too, or read the{" "}
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
