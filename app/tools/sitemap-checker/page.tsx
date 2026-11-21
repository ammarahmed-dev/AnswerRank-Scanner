import type { Metadata } from "next";
import Link from "next/link";
import ServiceCta from "@/app/components/ServiceCta";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import SitemapChecker from "./SitemapChecker";

export const metadata: Metadata = buildPageMetadata({
  title: "Free Sitemap Checker: Test and Validate sitemap.xml | AEOCheck",
  description:
    "Check your sitemap.xml: valid XML, URL count, lastmod dates, duplicates, wrong domains, broken URLs and whether robots.txt points to it. Free, no signup.",
  path: "/tools/sitemap-checker",
});

const faqs = [
  {
    q: "How do I check my website's sitemap?",
    a: "Enter your domain above. The checker finds your sitemap through robots.txt or the common default paths, parses recognized sitemap elements, counts the inspected URLs, flags duplicates, wrong domains and odd lastmod dates, and spot-checks a sample of the listed URLs for working status codes.",
  },
  {
    q: "What does the sitemap checker test?",
    a: "It finds your sitemap through robots.txt or the default locations, parses recognized sitemap elements, counts inspected URLs, flags duplicates, URLs on another domain, http URLs and query-string URLs, validates lastmod dates, selects up to five child sitemap entries and spot-checks at most eight listed page URLs. Index totals cover parsed children only, with selected/parsed/listed coverage shown. It is not full XML schema validation or an indexing report.",
  },
  {
    q: "Why does a sitemap matter for AI search?",
    a: "AI search crawlers and the search indexes behind them discover pages through links and sitemaps. A clean sitemap with accurate lastmod dates helps new and updated pages get found sooner. It does not guarantee indexing or citations.",
  },
  {
    q: "What is a good lastmod value?",
    a: "The real date a page's content last changed, in YYYY-MM-DD or full W3C datetime format. Setting every page to the build date makes the signal useless, so crawlers learn to ignore it.",
  },
  {
    q: "How do I tell crawlers where the sitemap is?",
    a: "Add a line to robots.txt: Sitemap: https://yourdomain.com/sitemap.xml. Also submit it in Google Search Console and Bing Webmaster Tools.",
  },
  {
    q: "What are the sitemap limits?",
    a: "The protocol permits up to 50,000 page URLs per sitemap and up to 50,000 child sitemap entries per index, with a 50 MB uncompressed file limit. Combined child URL totals may exceed 50,000. This tool has a separate 5 MiB response cap and selects at most five children; capped or failed children are not counted as parsed.",
  },
  {
    q: "Is the checker free?",
    a: "Yes. You can run up to 20 checks per month without an account.",
  },
];

const schema = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "AEOCheck Sitemap Checker",
    url: `${SITE_URL}/tools/sitemap-checker`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Free tool that validates a website's sitemap.xml and spot-checks the URLs it lists.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

export default function SitemapCheckerPage() {
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SiteHeader />
      <section className="launch-section llms-tool-section">
        <div className="launch-container">
          <div className="section-intro llms-tool-intro">
            <p className="launch-eyebrow">Free tool</p>
            <h1>Sitemap Checker: Validate Your sitemap.xml</h1>
            <p>Inspect recognized sitemap data, URL counts, lastmod dates and sampled links. See which child sitemaps were parsed and where coverage is limited.</p>
          </div>
          <SitemapChecker />
          <div className="llms-tool-faq">
            <h2>Sitemap questions</h2>
            {faqs.map((f) => (
              <div key={f.q} className="llms-tool-faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
            <p>
              Related: the <Link href="/tools/robots-txt-generator">robots.txt generator</Link> can add your Sitemap line, and the{" "}
              <Link href="/blog/technical-aeo-guide">technical AEO guide</Link> covers the rest of the checklist. Limits follow the <a href="https://www.sitemaps.org/protocol.html">Sitemaps protocol</a>; tool inspection caps are separate.
            </p>
          </div>
        </div>
      </section>
      <section className="launch-section"><div className="launch-container"><ServiceCta /></div></section>
      <SiteFooter />
    </main>
  );
}
