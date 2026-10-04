import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import ContentExtractability from "./ContentExtractability";

export const metadata: Metadata = buildPageMetadata({
  title: "Free Content Extractability Checker for AI Answers | AEOCheck",
  description:
    "See which sections of your page AI engines can quote on their own. Free checker that tests each heading's opening passage for answer-first structure, length and context.",
  path: "/tools/content-extractability",
});

const faqs = [
  {
    q: "What does extractability mean for AI search?",
    a: "AI answer engines quote short passages, not whole pages. A passage is extractable when it can be lifted out and still make sense: it answers the heading's question directly, is a reasonable length and does not depend on text above it.",
  },
  {
    q: "How does the checker judge a passage?",
    a: "It reads the text directly under each H2 and H3 and flags openings that are too short or too long, that start by pointing back to earlier text (This, It, They), that open with filler, or that have no text at all. It also notes question-style headings and passages with concrete numbers.",
  },
  {
    q: "Does a high score mean I will be cited?",
    a: "No. The score is a structural heuristic. Citations also depend on authority, relevance and whether crawlers can access the page. Use it to find passages worth rewriting, not as a ranking prediction.",
  },
  {
    q: "What does it read from my page?",
    a: "The HTML your server returns, inside the main or article element when present. Navigation, footer and sidebar text are ignored. Content that only appears after JavaScript runs is not seen, which is also how many AI crawlers behave.",
  },
  {
    q: "Is the checker free?",
    a: "Yes. You can analyze up to 20 pages per month without an account.",
  },
];

const schema = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "AEOCheck Content Extractability Checker",
    url: `${SITE_URL}/tools/content-extractability`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Free tool that checks whether each section of a page opens with a passage AI engines can quote.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

export default function ContentExtractabilityPage() {
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SiteHeader />
      <section className="launch-section llms-tool-section">
        <div className="launch-container">
          <div className="section-intro llms-tool-intro">
            <p className="launch-eyebrow">Free tool</p>
            <h1>Content Extractability Checker</h1>
            <p>
              Find out which sections of a page an AI engine can quote on their own. Each heading&apos;s opening
              passage is tested for answer-first structure, length and context.
            </p>
          </div>
          <ContentExtractability />
          <div className="llms-tool-faq">
            <h2>Extractability questions</h2>
            {faqs.map((f) => (
              <div key={f.q} className="llms-tool-faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
            <p>
              More on structuring pages for AI answers in the <Link href="/blog/technical-aeo-guide">technical AEO guide</Link>.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
