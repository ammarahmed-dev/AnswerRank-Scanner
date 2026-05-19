import type { Metadata } from "next";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Team | AEOCheck AI Scanner",
  description:
    "Meet the founder behind AEOCheck, the AI search readiness scanner built to help marketers, developers, and agencies improve AI visibility and answer engine optimization.",
  path: "/team",
});

const teamSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      name: "Ummar Ahmed",
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
              <p className="team-card-name">Ummar Ahmed</p>
              <p className="team-card-role">Founder and Developer</p>
              <p className="team-card-bio">
                Ummar is the developer and founder of AEOCheck. He built the scanner to help marketers and developers understand exactly how AI search engines evaluate their websites, turning a complex, fragmented set of signals into a single scored report with clear, prioritized fixes. His focus is on making AEO auditing, AI visibility scoring, and ChatGPT and Perplexity readiness practical and accessible to teams of any size.
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
            AEOCheck is intentionally a small, focused product. A lean team means every feature gets real attention, support responses come from someone who actually built the tool, and product decisions stay grounded in what real users need for AI search readiness, answer engine optimization, and client-ready reporting.
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
