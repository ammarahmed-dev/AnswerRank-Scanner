import type { Metadata } from "next";
import Link from "next/link";
import ServiceCta from "@/app/components/ServiceCta";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import RobotsTxtTester from "./RobotsTxtTester";

export const metadata: Metadata = buildPageMetadata({
  title: "Free Robots.txt Tester: Is This URL Blocked? | AEOCheck",
  description:
    "Test your robots.txt for any URL and crawler. See whether Googlebot, Bingbot, GPTBot or any user-agent is allowed or blocked, and which rule decided it. Free, no signup.",
  path: "/tools/robots-txt-tester",
});

const faqs = [
  {
    q: "How do I test my robots.txt file?",
    a: "Enter the full URL of a page and pick a crawler such as Googlebot. The tester fetches your live robots.txt, finds the rule group for that crawler, applies the longest matching rule and tells you whether the URL is allowed or blocked and which rule decided it.",
  },
  {
    q: "How does robots.txt choose between Allow and Disallow?",
    a: "A crawler uses its own User-agent group if one exists and otherwise the * group. Within that group the longest matching path wins, and Allow wins a tie. The * wildcard and the $ end-of-URL anchor are supported in paths.",
  },
  {
    q: "Does blocking a URL in robots.txt remove it from search results?",
    a: "Not by itself. robots.txt controls crawling, not indexing. A blocked URL can still appear in results if other pages link to it. To keep a page out of the index, allow crawling and use a noindex directive instead.",
  },
  {
    q: "Does this tool see firewall or CDN blocks?",
    a: "No. It only evaluates your robots.txt rules. A firewall or bot-protection rule can still block a crawler that robots.txt allows.",
  },
  {
    q: "Is the tester free?",
    a: "Yes. You can run up to 30 tests per month without an account.",
  },
];

const schema = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "AEOCheck Robots.txt Tester",
    url: `${SITE_URL}/tools/robots-txt-tester`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Free tool that tests whether a robots.txt allows a crawler to fetch a URL.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

export default function RobotsTxtTesterPage() {
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SiteHeader />
      <section className="launch-section llms-tool-section">
        <div className="launch-container">
          <div className="section-intro llms-tool-intro">
            <p className="launch-eyebrow">Free tool</p>
            <h1>Robots.txt Tester</h1>
            <p>
              Check whether a URL is blocked by your robots.txt for Googlebot, Bingbot, GPTBot or any crawler, and see
              exactly which rule decided it.
            </p>
          </div>
          <RobotsTxtTester />
          <div className="llms-tool-faq">
            <h2>Robots.txt tester questions</h2>
            {faqs.map((f) => (
              <div key={f.q} className="llms-tool-faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
            <p>
              Checking AI bots? See the <Link href="/tools/ai-crawler-checker">AI crawler checker</Link> or the guide to{" "}
              <Link href="/blog/robots-txt-ai-crawlers">robots.txt for AI crawlers</Link>. Need a file? Use the{" "}
              <Link href="/tools/robots-txt-generator">robots.txt generator</Link>.
            </p>
          </div>
        </div>
      </section>
      <section className="launch-section"><div className="launch-container"><ServiceCta /></div></section>
      <SiteFooter />
    </main>
  );
}
