import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import ArticleSchemaGenerator from "./ArticleSchemaGenerator";

export const metadata: Metadata = buildPageMetadata({
  title: "Free Article Schema Generator (BlogPosting JSON-LD) | AEOCheck",
  description:
    "Generate Article, BlogPosting or NewsArticle JSON-LD with author, dates, image and publisher so AI engines can attribute and date your content. Free.",
  path: "/tools/article-schema-generator",
});

const faqs = [
  {
    q: "What is Article schema?",
    a: "Article schema is JSON-LD that describes a piece of content: its headline, author, publish and update dates, image and publisher. It gives search and AI systems explicit facts about who wrote the page and when, instead of leaving them to guess from the layout.",
  },
  {
    q: "Should I use Article, BlogPosting or NewsArticle?",
    a: "Use BlogPosting for blog posts, NewsArticle for news reporting and Article for other editorial content. They share the same properties, so the choice mainly signals the kind of content.",
  },
  {
    q: "Why do dates and authors matter for AI citations?",
    a: "Engines prefer sources they can attribute and date, and fresher sources win on time-sensitive questions. Clear author and dateModified fields, matching the visible page, make that easy. They do not guarantee a citation.",
  },
  {
    q: "What is the difference between datePublished and dateModified?",
    a: "datePublished is when the article first went live; dateModified is when its content last meaningfully changed. Update dateModified only when the content really changes, and keep it equal to or later than the publish date.",
  },
  {
    q: "Is my data sent anywhere?",
    a: "No. The generator runs entirely in your browser and nothing you type is sent to a server.",
  },
];

const schema = [
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "AEOCheck Article Schema Generator",
    url: `${SITE_URL}/tools/article-schema-generator`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description: "Free browser-based tool that generates Article, BlogPosting and NewsArticle JSON-LD.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  },
];

export default function ArticleSchemaGeneratorPage() {
  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SiteHeader />
      <section className="launch-section llms-tool-section">
        <div className="launch-container">
          <div className="section-intro llms-tool-intro">
            <p className="launch-eyebrow">Free tool</p>
            <h1>Article Schema Generator</h1>
            <p>Add the author, dates and image AI engines look for. Fill in your post details and copy valid Article or BlogPosting JSON-LD. Runs in your browser.</p>
          </div>
          <ArticleSchemaGenerator />
          <div className="llms-tool-faq">
            <h2>Article schema questions</h2>
            {faqs.map((f) => (
              <div key={f.q} className="llms-tool-faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
            <p>
              Also useful: the <Link href="/tools/organization-schema-generator">Organization schema generator</Link> for who publishes the site, and the{" "}
              <Link href="/blog/technical-aeo-guide">technical AEO guide</Link>.
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
