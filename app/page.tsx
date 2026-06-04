import HomePageClient from "./components/HomePageClient";
import SchemaMarkup from "./components/SchemaMarkup";
import SiteFooter from "./components/SiteFooter";
import { buildPageMetadata } from "@/lib/seo";
import { getLatestPosts } from "@/lib/blog";

export const metadata = buildPageMetadata({
  title: "AEOCheck - Free AEO Scanner & AI Search Readiness Audit",
  description:
    "Scan any URL for AEO and AI search readiness. Check metadata, schema, headings, content clarity, and visibility for ChatGPT and Perplexity.",
  path: "/",
});

export default function HomePage() {
  const latestPosts = getLatestPosts(3);
  const heroContent = (
    <>
      <p className="hero-badge">25 AEO + GEO checks · Free · No signup</p>
      <h1>
        Can{" "}
        <span style={{ color: "#00f0b4" }}>ChatGPT and Perplexity</span>{" "}
        find your website?
      </h1>
      <p className="hero-lede">
        ChatGPT and Perplexity choose which websites to reference when answering questions. AEOCheck scans your page and shows whether your site qualifies - and exactly what to fix if it doesn&apos;t.
      </p>
    </>
  );

  return (
    <>
      <SchemaMarkup />
      <HomePageClient heroContent={heroContent} latestPosts={latestPosts} />
      <SiteFooter />
    </>
  );
}

