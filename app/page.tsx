import HomePageClient from "./components/HomePageClient";
import SchemaMarkup from "./components/SchemaMarkup";
import SiteFooter from "./components/SiteFooter";
import { buildPageMetadata } from "@/lib/seo";
import { getLatestPosts } from "@/lib/blog";

export const metadata = buildPageMetadata({
  title: "Free ChatGPT Visibility Checker | AEOCheck",
  description:
    "Run a free ChatGPT visibility check on any URL. AEOCheck scans 25+ AI search signals and shows exactly what to fix to appear in ChatGPT and Perplexity answers.",
  path: "/",
});

export default function HomePage() {
  const latestPosts = getLatestPosts(3);
  const heroContent = (
    <>
      <p className="hero-badge">25 AEO + GEO checks · Free · No signup</p>
      <h1>Fix the reasons <span style={{ color: "#00f0b4" }}>AI search</span> ignores your website</h1>
      <p className="hero-lede">
        Paste any public URL. Get an AI visibility score, prioritized fixes, and a client-ready PDF - in 60 seconds.
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

