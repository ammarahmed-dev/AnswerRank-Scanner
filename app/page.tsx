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
      <h1>Free AEO &amp; AI Search Readiness Scanner</h1>
      <p className="hero-lede">
        Paste any URL and get a free AEO readiness score in 60 seconds &mdash; with every fix ranked by impact.
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
