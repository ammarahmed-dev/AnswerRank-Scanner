import type { Metadata } from "next";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import AiVisibilityClient from "./AiVisibilityClient";

// Dark launch: admin-only and not linked from navigation or the sitemap.
export const metadata: Metadata = {
  title: "AI Visibility Tracker | AEOCheck",
  robots: { index: false, follow: false },
};

export default function AiVisibilityPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="launch-section llms-tool-section">
        <div className="launch-container">
          <div className="section-intro llms-tool-intro">
            <p className="launch-eyebrow">Admin preview</p>
            <h1>AI Visibility Tracker</h1>
            <p>Ask AI answer engines buyer-style questions and see whether your brand is mentioned or cited.</p>
          </div>
          <AiVisibilityClient />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
