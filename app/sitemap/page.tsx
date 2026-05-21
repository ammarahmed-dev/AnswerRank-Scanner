import type { Metadata } from "next";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { getAllBlogPosts } from "@/lib/blog";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "HTML Sitemap | AEOCheck",
  description:
    "Browse the AEOCheck HTML sitemap with links to scanner pages, blog guides, sample reports, comparison pages, and legal resources.",
  path: "/sitemap",
});

export default function HtmlSitemapPage() {
  const posts = getAllBlogPosts();

  return (
    <>
      <SiteHeader />
      <main className="legal-page">
        <div className="legal-page-inner">
          <h1>Sitemap</h1>
          <p>
            This page is a human-readable sitemap for AEOCheck. For crawler XML sitemap files, see <a href="/sitemap.xml">/sitemap.xml</a>.
          </p>

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
