import Link from "next/link";
import type { Metadata } from "next";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Team | AEOCheck Answer Engine Optimization Scanner",
  description:
    "Meet the founder behind AEOCheck and learn why this AI search readiness scanner helps agencies, Webflow developers, and SEO freelancers create better AI visibility reports.",
  path: "/team",
});

const teamSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      name: "Ammar Ahmed",
      jobTitle: "Founder and Developer",
      worksFor: {
        "@type": "Organization",
        name: "AEOCheck",
        url: SITE_URL,
      },
      url: "https://www.aeocheck.co/team",
      sameAs: ["https://www.linkedin.com/in/ummar-ahmed/"],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.aeocheck.co" },
        { "@type": "ListItem", position: 2, name: "Team", item: "https://www.aeocheck.co/team" },
      ],
    },
  ],
};

export default function TeamPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(teamSchema) }} />
      <SiteHeader />
      <main className="legal-page team-page">
        <div className="legal-page-inner">
          <h1>The Team</h1>
          <p className="legal-updated">The people building AEOCheck</p>

          <h2>Founder</h2>
          <div className="team-grid">
            <div className="team-card">
              <p className="team-card-name">Ammar Ahmed</p>
              <p className="team-card-role">Founder and Developer</p>
              <p className="team-card-bio">
                Ammar is the developer and founder of <Link href="/">AEOCheck</Link>. He built the scanner to help teams understand how answer engine optimization and AI search readiness actually impact visibility in ChatGPT, Perplexity, and Google AI results. The goal is simple: convert scattered technical signals into clear AI visibility reports with prioritized fixes.
              </p>
              <div className="team-card-links">
                <a
                  href="https://www.linkedin.com/in/ummar-ahmed/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  LinkedIn
                </a>
              </div>
            </div>
          </div>

          <h2>Built to stay lean</h2>
          <p>
            AEOCheck is intentionally a small, focused product. A lean team means every feature gets real attention, support responses come from someone who built the tool, and product decisions stay grounded in what agencies, Webflow developers, SEO freelancers, and founders need from AI visibility reports.
          </p>
          <p>
            If you are evaluating the product, run the <Link href="/#scanner">free AEOCheck scan</Link> or <a href="/sample-report">review a sample AI visibility report</a>.
          </p>
          <p>
            Questions, feedback, or ideas: <a href="mailto:hello@aeocheck.co">hello@aeocheck.co</a>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
