import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { getAllBlogPosts } from "@/lib/blog";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "AEOCheck Blog | AI Search and Answer Engine Optimization Guides",
  description:
    "Practical guides for AEO, AI search visibility, ChatGPT and Perplexity visibility, schema audits, and AI search readiness.",
  path: "/blog",
});

function formatDate(value: string | Date) {
  const date = value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.aeocheck.co" },
    { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.aeocheck.co/blog" },
  ],
};

export default function BlogPage() {
  const posts = getAllBlogPosts();

  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <SiteHeader />
      <section className="launch-container blog-index-page">
        <div className="section-intro">
          <p className="launch-eyebrow">Blog</p>
          <h1>AI search visibility guides.</h1>
          <p>Practical notes for making websites easier for ChatGPT, Perplexity, Google AI, and answer engines to understand.</p>
          <p>Want to see how your site scores right now? <Link href="https://www.aeocheck.co/#scanner">Scan your site free</Link> and get your AEO score in under 60 seconds.</p>
        </div>

        <div className="blog-index-list">
          {posts.map((post) => {
            const coverImage = post.coverImage?.trim();

            return (
              <Link href={`/blog/${post.slug}`} className="blog-index-card" key={post.slug}>
                <article className="blog-index-card-inner">
                  {coverImage && (
                    <div className="blog-index-card-media">
                      <Image
                        src={coverImage}
                        alt={post.coverImageAlt ?? post.title}
                        width={1200}
                        height={400}
                        sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
                      />
                    </div>
                  )}
                  <div className="blog-index-card-body">
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                    <p className="blog-card-author">By Ummar Ahmed</p>
                    <h2>{post.title}</h2>
                    <p>{post.description}</p>
                    {post.tags.length > 0 && (
                      <div className="blog-tag-row">
                        {post.tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </section>
      <style>{`
        .blog-index-list {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
          margin-top: 34px;
        }

        .blog-index-card {
          display: block;
          height: 100%;
          color: inherit;
          text-decoration: none;
        }

        .blog-index-card-inner {
          display: flex;
          min-height: 430px;
          height: 100%;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          background: var(--bg-card);
        }

        .blog-index-card-media {
          height: 200px;
          flex: 0 0 200px;
          overflow: hidden;
          border-radius: calc(var(--radius-lg) - 2px) calc(var(--radius-lg) - 2px) 0 0;
          background: var(--bg-2);
        }

        .blog-index-card-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .blog-index-card-body {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 10px;
          padding: 18px;
        }

        .blog-index-card-body time {
          color: var(--text-muted);
          font-family: var(--font-mono);
          font-size: 0.82rem;
          font-weight: 500;
        }

        .blog-card-author {
          color: var(--text-muted);
          font-size: 0.78rem;
          font-weight: 500;
          margin: -4px 0 0;
        }

        .blog-index-card-body h2 {
          color: var(--text);
          font-family: var(--font-display);
          font-size: 1.22rem;
          font-weight: 700;
          letter-spacing: 0;
          line-height: 1.15;
        }

        .blog-index-card-body p {
          display: -webkit-box;
          overflow: hidden;
          color: var(--text-muted);
          line-height: 1.6;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
        }

        .blog-index-card-body .blog-tag-row {
          margin-top: auto;
        }

        @media (max-width: 1100px) {
          .blog-index-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .blog-index-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <SiteFooter />
    </main>
  );
}
