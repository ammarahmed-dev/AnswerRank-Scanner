import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import MetaTagChecker from "./MetaTagChecker";

export const metadata: Metadata = buildPageMetadata({
  title: "Free Meta Tag Checker with Search and Social Preview | AEOCheck",
  description:
    "Check a page's title, meta description, canonical, Open Graph and Twitter tags, see how it looks in search and social previews, and fix what is missing. Free.",
  path: "/tools/meta-tag-checker",
});

const faqs = [
  {
    q: "What does the meta tag checker look at?",
    a: "The title tag, meta description, canonical URL, Open Graph title, description and image, the robots meta tag, viewport, page language and Twitter card. It also shows how the page appears as a search result and a social card.",
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
    a: "It tells search engines not to index the page. If a page you want found has noindex, it will not appear in search results, and AI engines that rely on search indexes can miss it too. The checker flags it as a problem.",
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
            <p>See a page&apos;s title, description, canonical and social tags the way search and AI engines read them, with live search and social previews.</p>
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
              More on metadata in the <Link href="/blog/technical-aeo-guide">technical AEO guide</Link>. To check structured data too, use the{" "}
              <Link href="/tools/schema-checker">schema markup checker</Link>.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
