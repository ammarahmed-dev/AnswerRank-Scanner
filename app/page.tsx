import HomePageClient from "./components/HomePageClient";
import SchemaMarkup from "./components/SchemaMarkup";
import SiteFooter from "./components/SiteFooter";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "AEOCheck - Free AEO Scanner & AI Search Readiness Audit",
  description:
    "Scan any URL for AI search readiness. AEOCheck checks metadata, schema, headings, content clarity, and answer readiness for ChatGPT, Perplexity, and Google AI results.",
  path: "/",
});

export default function HomePage() {
  const heroContent = (
    <>
      <p className="hero-badge">25 AEO + GEO checks</p>
      <h1>
        Is your site visible to{" "}
        <span style={{ color: "#00f0b4" }}>AI search</span>?
      </h1>
      <p className="hero-lede">
        Scan any URL in 60 seconds with a free AEO scanner. Get an AI readiness score, missing schema issues, content clarity gaps, and prioritized fixes for ChatGPT, Perplexity, and Google AI results.
      </p>
      <p className="hero-lede">
        New to AEO? Start with our guide: <a href="/blog/what-is-aeo-answer-engine-optimization">What Is AEO? Answer Engine Optimization for AI Search</a>.
      </p>
    </>
  );

  return (
    <>
      <SchemaMarkup />
      <HomePageClient heroContent={heroContent} />
      <SiteFooter />
    </>
  );
}

