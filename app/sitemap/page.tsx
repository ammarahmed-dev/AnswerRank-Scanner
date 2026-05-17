import type { Metadata } from "next";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { getAllBlogPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Sitemap | AEOCheck AI Scanner",
  description: "Browse all pages on AEOCheck - the AI search readiness scanner. Main pages, blog, comparisons, app, and legal sections.",
  alternates: {
    canonical: "https://www.aeocheck.co/sitemap",
  },
  openGraph: {
    url: "https://www.aeocheck.co/sitemap",
    siteName: "AEOCheck",
    type: "website",
    images: [{ url: "https://www.aeocheck.co/api/og" }],
  },
};

export default function HtmlSitemapPage() {
  const posts = getAllBlogPosts();

  return (
    <>
      <SiteHeader />
      <main className="legal-page">
        <div className="legal-page-inner">
          <h1>Sitemap</h1>

          <h2>Main</h2>
          <ul>
            <li><a href="/">Home</a> - Free AEO and AI search readiness scanner</li>
            <li><a href="/about">About</a> - Who we are and what AEOCheck does</li>
            <li><a href="/team">Team</a> - Meet the people behind AEOCheck</li>
            <li><a href="/contact">Contact</a> - Get in touch with the AEOCheck team</li>
            <li><a href="/sample-report">Sample Report</a> - See a full AEO report before you scan</li>
          </ul>

          <h2>Blog</h2>
          <ul>
            <li><a href="/blog">All Articles</a> - AEO guides, tips, and research</li>
            {posts.map((post) => (
              <li key={post.slug}>
                <a href={`/blog/${post.slug}`}>{post.title}</a>
                {post.description && <> - {post.description}</>}
              </li>
            ))}
          </ul>

          <h2>Compare</h2>
          <ul>
            <li><a href="/vs/otterly">AEOCheck vs Otterly</a></li>
            <li><a href="/vs/semrush-ai">AEOCheck vs Semrush AI</a></li>
            <li><a href="/vs/peec-ai">AEOCheck vs Peec AI</a></li>
            <li><a href="/vs/profound">AEOCheck vs Profound</a></li>
          </ul>

          <h2>App</h2>
          <ul>
            <li><a href="/login">Log In</a></li>
            <li><a href="/signup">Sign Up</a></li>
            <li><a href="/dashboard">Dashboard</a></li>
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
