import type { Metadata } from "next";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";

export const metadata: Metadata = {
  title: "About AEOCheck | AI Search Readiness Scanner",
  description: "Learn about AEOCheck - the AI search readiness tool that helps marketers and developers understand how AI engines see their websites.",
  alternates: {
    canonical: "https://www.aeocheck.co/about",
  },
  openGraph: {
    url: "https://www.aeocheck.co/about",
    siteName: "AEOCheck",
    type: "website",
    images: [{ url: "https://www.aeocheck.co/api/og" }],
  },
};

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
        url: "https://www.aeocheck.co",
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
      <main className="legal-page">
        <div className="legal-page-inner">
          <h1>About AEOCheck</h1>

          <h2>Who we are</h2>
          <p>
            AEOCheck is an AI search readiness scanner built by developers who noticed that most websites were invisible to AI-powered search engines - not because they lacked quality, but because they lacked the right signals. We set out to make that gap visible, actionable, and fixable for any team.
          </p>
          <p>
            We are a small, independent tool built and operated by <a href="/team">a developer focused on practical AEO and AI discoverability</a>. No VC funding, no bloated team, no enterprise pricing. Just a focused tool that does one thing well.
          </p>

          <h2>What AEOCheck does</h2>
          <p>
            AEOCheck scans any public web page and evaluates it across over 25 signals that AI search engines use to understand, trust, and cite content. That includes metadata quality, schema markup, heading structure, content depth, trust signals, internal linking, and performance.
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
