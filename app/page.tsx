import HomePageClient from "./components/HomePageClient";
import HomeStaticSections from "./components/HomeStaticSections";
import SchemaMarkup from "./components/SchemaMarkup";
import SiteFooter from "./components/SiteFooter";
import { buildPageMetadata } from "@/lib/seo";
import { getLatestPosts } from "@/lib/blog";

export const metadata = buildPageMetadata({
  title: "Free AI SEO Audit & AEO Checker for ChatGPT Visibility | AEOCheck",
  description:
    "Free AI SEO audit and AEO checker: scan any URL for 25 AI search signals and see what to fix to appear in ChatGPT, Perplexity and AI Overviews.",
  path: "/",
});

export default function HomePage() {
  const latestPosts = getLatestPosts(3);
  const heroContent = (
    <>
      <p className="hero-badge">25 AI SEO checks · AEO + GEO · Free · No signup</p>
      <h1>Fix the reasons <span style={{ color: "#00f0b4" }}>AI search</span> ignores your website</h1>
      <p className="hero-lede">
        Paste any public URL. Get an AI visibility score, prioritized fixes, and a client-ready PDF - in 60 seconds.
      </p>
    </>
  );

  return (
    <>
      <SchemaMarkup />
      <HomePageClient heroContent={heroContent} staticSections={<HomeStaticSections latestPosts={latestPosts} />} />
      <SiteFooter />
    </>
  );
}

