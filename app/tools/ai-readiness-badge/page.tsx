import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import AiReadinessBadge from "./AiReadinessBadge";

export const metadata: Metadata = buildPageMetadata({
  title: "Free AI Readiness Score Badge for Your Website | AEOCheck",
  description:
    "Show your site's AI readiness score on your website or README. Free embeddable badge that updates daily from a scan of your homepage. Copy the HTML or Markdown.",
  path: "/tools/ai-readiness-badge",
});

const faqs = [
  {
    q: "What does the badge score?",
    a: "It runs AEOCheck's scan on your homepage (crawler access, structured data, metadata, content signals and trust signals) and shows the result out of 100. It skips the PageSpeed measurement, so it can differ a little from a full report score.",
  },
  {
    q: "How often does it update?",
    a: "Each badge is cached for about a day, then refreshed from a new scan the next time it is requested.",
  },
  {
    q: "Can I show a badge for a site I do not own?",
    a: "The badge only reads public pages, so it works for any public domain. Only show your own score on your own site.",
  },
  {
    q: "What if the badge says n/a?",
    a: "The scan could not read the homepage (for example, bot protection) or the service was busy. It retries within minutes.",
  },
];

const schema = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "AEOCheck AI Readiness Badge",
    url: `${SITE_URL}/tools/ai-readiness-badge`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Free embeddable badge showing a website's AI readiness score.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

export default function AiReadinessBadgePage() {
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SiteHeader />
      <section className="launch-section llms-tool-section">
        <div className="launch-container">
          <div className="section-intro llms-tool-intro">
            <p className="launch-eyebrow">Free tool</p>
            <h1>AI Readiness Score Badge</h1>
            <p>Show visitors how ready your site is for AI search. Enter your domain, copy the snippet, paste it in your footer or README.</p>
          </div>
          <AiReadinessBadge />
          <div className="llms-tool-faq">
            <h2>Badge questions</h2>
            {faqs.map((f) => (
              <div key={f.q} className="llms-tool-faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
            <p>
              Low score? The <Link href="/ai-seo-audit">free AI SEO audit</Link> lists what to fix and generates the
              files for the common problems.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
