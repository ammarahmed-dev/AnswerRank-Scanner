import type { Metadata } from "next";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "About AEOCheck | AEO Scanner and AI Search Readiness Tool",
  description:
    "AEOCheck is an AEO scanner and AI search readiness tool for ChatGPT visibility, Perplexity visibility, schema and metadata checks, AI visibility scores, and client-ready reports.",
  path: "/about",
});

const aboutSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      name: "About AEOCheck",
      url: "https://www.aeocheck.co/about",
      description:
        "AEOCheck is an AI search readiness scanner built to help marketers and developers understand how AI search engines evaluate their websites.",
      publisher: {
        "@type": "Organization",
        name: "AEOCheck",
        url: SITE_URL,
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.aeocheck.co" },
        { "@type": "ListItem", position: 2, name: "About", item: "https://www.aeocheck.co/about" },
      ],
    },
  ],
};

export default function AboutPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }} />
      <SiteHeader />
      <main className="legal-page about-page">
        <div className="legal-page-inner">
          <h1>About AEOCheck</h1>

          <h2>Who we are</h2>
          <p>
          AEOCheck is an AEO scanner and AI search readiness tool that helps websites understand how visible they are to AI search engines like ChatGPT, Perplexity, and Google AI results. We built it after seeing strong websites miss AI citations because they lacked clear machine-readable signals.
          </p>
          <p>
            We are a small, independent product built and operated by <a href="/team">a developer focused on practical AEO and AI discoverability</a>. AEOCheck gives teams an AI visibility score, clear answer engine optimization guidance, schema and metadata checks, and client-ready reports they can share internally or with clients.
          </p>

          <h2>What AEOCheck does</h2>
          <p>
            AEOCheck scans any public web page and evaluates it across over 25 signals that AI search engines use to understand, trust, and cite content. That includes metadata quality, schema markup, heading structure, content depth, trust signals, internal linking, performance, and answer engine optimization signals that affect AI search visibility.
          </p>
          <p>
            Every scan returns a 0-100 visibility score, a category-by-category breakdown, and a prioritized list of fixes ranked by impact. No jargon, no padding, no filler recommendations - just a clear picture of where your page stands and what to do next.
          </p>

          <h2>The story behind it</h2>
          <p>
            AEOCheck started as an internal tool for auditing client websites before submitting them for AI-powered directories and citations. The same issues kept coming up: missing schema, thin metadata, no FAQ blocks, no clear entity definition. It was repetitive work that deserved automation.
          </p>
          <p>
            Once the scanner was reliable enough to catch real issues consistently, it made sense to open it up. Hundreds of marketers, developers, and agency teams now use AEOCheck to understand how AI engines see their pages - and what to fix to show up in AI-generated answers.
          </p>
          <p>
            If you want to test your own site, start with the <a href="/#scanner">free homepage scanner</a>. You can also <a href="/sample-report">view a sample report</a> before running your first scan.
          </p>

          <h2>Our commitment</h2>
          <p>
            AEOCheck will always have a free tier. The core scan - the score, the category breakdown, and the top issues - is free with no signup required. The full report, PDF export, and Pro scanning history are paid features that fund the infrastructure and keep the free tier running.
          </p>
          <p>
            We do not sell scan data. We do not share your URLs with third parties for any purpose other than fetching the page to analyze it. Your data is yours.
          </p>

          <h2>Meet the team</h2>
          <p>
            AEOCheck is built and maintained by a focused team of one. <a href="/team">Meet the founder</a> behind the scanner.
          </p>

          <h2>Contact</h2>
          <p>
            Questions, feedback, or partnership inquiries: <a href="mailto:hello@aeocheck.co">hello@aeocheck.co</a>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
