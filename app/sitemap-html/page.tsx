import Link from "next/link";
import type { Metadata } from "next";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Sitemap | AEOCheck AI Scanner",
  description:
    "Legacy HTML sitemap for AEOCheck pages, comparison guides, blog posts, and legal resources.",
  path: "/sitemap-html",
  noindex: true,
});

export default function HtmlSitemapPage() {
  return (
    <>
      <SiteHeader />
      <main className="legal-page">
        <div className="legal-page-inner">
          <h1>Sitemap</h1>

          <h2>Main</h2>
          <ul>
            <li><Link href="/">Home</Link> - Free AEO and AI search readiness scanner</li>
            <li><a href="/about">About</a> - Who we are and what AEOCheck does</li>
            <li><a href="/team">Team</a> - Meet the people behind AEOCheck</li>
            <li><a href="/sample-report">Sample Report</a> - See a full AEO report before you scan</li>
          </ul>

          <h2>Blog</h2>
          <ul>
            <li><Link href="/blog">All Articles</Link> - AEO guides, tips, and research</li>
            <li><Link href="/blog/aeo-checklist-webflow-developers">AEO Checklist for Webflow Developers</Link></li>
          </ul>

          <h2>Compare</h2>
          <ul>
            <li><Link href="/vs/otterly">AEOCheck vs Otterly</Link></li>
            <li><Link href="/vs/semrush-ai">AEOCheck vs Semrush AI</Link></li>
            <li><Link href="/vs/peec-ai">AEOCheck vs Peec AI</Link></li>
            <li><Link href="/vs/profound">AEOCheck vs Profound</Link></li>
          </ul>

          <h2>Legal</h2>
          <ul>
            <li><a href="/privacy-policy">Privacy Policy</a></li>
            <li><a href="/terms-of-service">Terms of Service</a></li>
            <li><a href="/refund-policy">Refund Policy</a></li>
          </ul>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
