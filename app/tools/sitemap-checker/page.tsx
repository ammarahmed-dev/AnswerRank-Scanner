import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import SitemapChecker from "./SitemapChecker";

export const metadata: Metadata = buildPageMetadata({
  title: "Free Sitemap Checker: Validate sitemap.xml | AEOCheck",
  description:
    "Check your sitemap.xml: valid XML, URL count, lastmod dates, duplicates, wrong domains, broken URLs and whether robots.txt points to it. Free, no signup.",
  path: "/tools/sitemap-checker",
});

const faqs = [
  {
    q: "What does the sitemap checker test?",
    a: "It finds your sitemap through robots.txt or the default locations, checks that it is valid XML, counts URLs, flags duplicates, URLs on another domain, http URLs and query-string URLs, validates lastmod dates, follows up to five child sitemaps and spot-checks that listed URLs return a success status.",
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
    a: "Each sitemap file can hold up to 50,000 URLs and 50 MB uncompressed. Larger sites split into several files listed in a sitemap index.",
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
            <h1>Sitemap Checker</h1>
            <p>Enter your website and see whether your sitemap is valid, current and trustworthy: URLs, lastmod dates, broken links and robots.txt reference.</p>
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
              <Link href="/blog/technical-aeo-guide">technical AEO guide</Link> covers the rest of the checklist.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
