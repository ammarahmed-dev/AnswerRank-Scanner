import HomePageClient from "./components/HomePageClient";
import SchemaMarkup from "./components/SchemaMarkup";
import { ShieldCheck } from "lucide-react";

export default function HomePage() {
  const heroContent = (
    <>
      <p className="launch-eyebrow hero-trust-pills mb-4 ml-px">
        <ShieldCheck className="h-4 w-4" />
        <span>Free</span>
        <span>No signup</span>
        <span>60-second scan</span>
        <span>Works on any public URL</span>
      </p>
      <h1>Find out if AI search engines can understand and recommend your website</h1>
      <p className="hero-lede">
        Scan any URL in 60 seconds. Get an AI readiness score, missing schema issues, content clarity gaps, and prioritized fixes for ChatGPT, Perplexity, and Google AI results.
      </p>
    </>
  );

  return (
    <>
      <SchemaMarkup />
      <HomePageClient heroContent={heroContent} />
    </>
  );
}
