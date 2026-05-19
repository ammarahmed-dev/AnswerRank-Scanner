import HomePageClient from "./components/HomePageClient";
import SchemaMarkup from "./components/SchemaMarkup";
import SiteFooter from "./components/SiteFooter";

export default function HomePage() {
  const heroContent = (
    <>
      <p className="hero-badge">✦ 25 AEO + GEO checks</p>
      <h1>
        Is your site visible to{" "}
        <span style={{ color: "#00f0b4" }}>AI search</span>?
      </h1>
      <p className="hero-lede">
        Scan any URL in 60 seconds. Get an AI readiness score, missing schema issues, content clarity gaps, and prioritized fixes for ChatGPT, Perplexity, and Google AI results.
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
