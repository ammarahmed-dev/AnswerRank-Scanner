import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { getAllBlogPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "AEOCheck Blog - AI Search and AEO Guides",
  description: "Practical guides for improving AI search visibility, answer engine optimization, schema, and technical content readiness.",
  alternates: {
    canonical: "https://aeocheck.co/blog",
  },
};

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

export default function BlogPage() {
  const posts = getAllBlogPosts();

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="launch-container blog-index-page">
        <div className="section-intro">
          <p className="launch-eyebrow">Blog</p>
          <h1>AI search visibility guides.</h1>
          <p>Practical notes for making websites easier for ChatGPT, Perplexity, Google AI, and answer engines to understand.</p>
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
                        alt={post.title}
                        width={1200}
                        height={400}
                        sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
                      />
                    </div>
                  )}
                  <div className="blog-index-card-body">
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
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
          transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
        }

        .blog-index-card:hover {
          transform: translateY(-4px);
        }

        .blog-index-card-inner {
          display: flex;
          min-height: 430px;
          height: 100%;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid var(--color-line);
          border-radius: var(--radius-lg);
          background: rgba(15, 23, 42, 0.58);
        }

        .blog-index-card:hover .blog-index-card-inner {
          border-color: rgba(124, 106, 255, 0.42);
          background: rgba(15, 23, 42, 0.72);
        }

        .blog-index-card-media {
          height: 200px;
          flex: 0 0 200px;
          overflow: hidden;
          border-radius: calc(var(--radius-lg) - 2px) calc(var(--radius-lg) - 2px) 0 0;
          background: rgba(2, 6, 23, 0.5);
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
          color: var(--color-ink-muted);
          font-size: 0.82rem;
          font-weight: 800;
        }

        .blog-index-card-body h2 {
          color: white;
          font-size: 1.22rem;
          font-weight: 950;
          letter-spacing: 0;
          line-height: 1.15;
        }

        .blog-index-card-body p {
          display: -webkit-box;
          overflow: hidden;
          color: var(--color-ink-soft);
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
