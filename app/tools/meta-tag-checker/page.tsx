import type { Metadata } from "next";
import Link from "next/link";
import ServiceCta from "@/app/components/ServiceCta";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import MetaTagChecker from "./MetaTagChecker";

export const metadata: Metadata = buildPageMetadata({
  title: "Free Meta Tag Checker: Title, Description and OG Tags | AEOCheck",
  description:
    "Check a page's title, meta description, canonical, Open Graph and Twitter tags, see how it looks in search and social previews, and fix what is missing. Free.",
  path: "/tools/meta-tag-checker",
});

const faqs = [
  {
    q: "How do I check my meta tags online?",
    a: "Enter a page URL above. The checker reads the title, meta description, canonical, Open Graph and Twitter tags, shows illustrative search and social previews, and lists what is missing or too long.",
  },
  {
    q: "What does the meta tag checker look at?",
    a: "The title tag, meta description, canonical URL, Open Graph title, description and image, repeated generic robots and Googlebot meta tags, viewport, page language and Twitter card. Previews are illustrative; engines may use different titles, descriptions or images. HTTP X-Robots-Tag headers, robots.txt access and actual indexing are not verified.",
  },
  {
    q: "How long should a title and meta description be?",
    a: "Aim for a title of 30 to 60 characters and a meta description of 120 to 160 characters. Longer text is still read by crawlers but gets truncated in results. The checker uses the same thresholds as the AEOCheck scanner.",
  },
  {
    q: "Why do meta tags matter for AI search?",
    a: "Metadata is often the first summary an engine reads of a page, and it shapes how the page is labeled when it is shown or cited. A specific title, a clear description and a canonical URL reduce ambiguity about what the page is and which URL to cite.",
  },
  {
    q: "What does a noindex robots tag do?",
    a: "A readable generic noindex directive asks search crawlers to exclude the page; a Googlebot-specific directive addresses Google Search. The checker reviews all matching HTML meta tags and flags noindex or none even when another tag says index. Crawlers must access the page to read these instructions. No detected noindex is not proof of indexability or AI inclusion.",
  },
  {
    q: "Which URL is checked after a redirect?",
    a: "The checker inspects HTML returned at the fetched destination and shows requested and fetched URLs separately. Canonical checks and illustrative preview host labels use the fetched URL. Older responses may lack fetch-source evidence. This does not verify indexing, crawler access or a social platform's cached preview.",
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
    name: "AEOCheck Meta Tag Checker",
    url: `${SITE_URL}/tools/meta-tag-checker`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Free tool that checks a page's meta tags and shows its search and social previews.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

export default function MetaTagCheckerPage() {
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SiteHeader />
      <section className="launch-section llms-tool-section">
        <div className="launch-container">
          <div className="section-intro llms-tool-intro">
            <p className="launch-eyebrow">Free tool</p>
            <h1>Meta Tag Checker</h1>
            <p>Inspect a page&apos;s HTML title, description, canonical, robots and social tags, with illustrative search and social previews.</p>
          </div>
          <MetaTagChecker />
          <div className="llms-tool-faq">
            <h2>Meta tag questions</h2>
            {faqs.map((f) => (
              <div key={f.q} className="llms-tool-faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
            <p>
              To interpret each field, read the{" "}
              <Link href="/blog/how-to-check-meta-tags">step-by-step meta tag checking guide</Link>. For related on-page signals, see the{" "}
              <Link href="/blog/technical-aeo-guide">technical AEO guide</Link> and the{" "}
              <Link href="/tools/schema-checker">schema markup checker</Link>. For directive behavior, see{" "}
              <a href="https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag">Google&apos;s robots meta documentation</a>.
            </p>
          </div>
        </div>
      </section>
      <section className="launch-section"><div className="launch-container"><ServiceCta /></div></section>
      <SiteFooter />
    </main>
  );
}
