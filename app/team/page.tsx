import type { Metadata } from "next";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";

export const metadata: Metadata = {
  title: "Team | AEOCheck AI Scanner",
  description: "Meet the team behind AEOCheck - the AI search readiness scanner built to help marketers and developers understand how AI engines see their websites.",
  alternates: {
    canonical: "https://www.aeocheck.co/team",
  },
  openGraph: {
    url: "https://www.aeocheck.co/team",
    siteName: "AEOCheck",
    type: "website",
    images: [{ url: "https://www.aeocheck.co/api/og" }],
  },
};

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Ummar Ahmed",
  jobTitle: "Founder and Developer",
  worksFor: {
    "@type": "Organization",
    name: "AEOCheck",
    url: "https://www.aeocheck.co",
  },
  url: "https://www.aeocheck.co/team",
  sameAs: ["https://www.linkedin.com/in/ummar-ahmed/"],
};

export default function TeamPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <SiteHeader />
      <main className="legal-page">
        <div className="legal-page-inner">
          <h1>The Team</h1>
          <p className="legal-updated">The people building AEOCheck</p>

          <h2>Founder</h2>
          <div className="team-grid">
            <div className="team-card">
              <p className="team-card-name">Ummar Ahmed</p>
              <p className="team-card-role">Founder and Developer</p>
              <p className="team-card-bio">
                Ummar is the developer and founder of AEOCheck. He built the scanner to help marketers and developers understand exactly how AI search engines evaluate their websites - turning a complex, fragmented set of signals into a single scored report with clear, prioritized fixes. His focus is on making AEO auditing fast, practical, and accessible to teams of any size without needing an enterprise contract or a dedicated SEO analyst.
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
            AEOCheck is intentionally a small, focused product. A lean team means every feature gets real attention, support responses come from someone who actually built the tool, and product decisions stay grounded in what real users need - not what sounds good in a pitch deck.
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
