import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { getAllBlogPosts, getBlogPost } from "@/lib/blog";
import "./blog-post.css";

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function generateStaticParams() {
  return getAllBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) {
    return {
      title: "Blog post not found - AEOCheck",
    };
  }

  const ogImage = post.coverImage
    ? post.coverImage.startsWith("http")
      ? post.coverImage
      : `https://www.aeocheck.co${post.coverImage}`
    : "https://www.aeocheck.co/api/og";

  return {
    title: `${post.title} - AEOCheck`,
    description: post.description,
    alternates: {
      canonical: `https://www.aeocheck.co/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: `https://www.aeocheck.co/blog/${post.slug}`,
      publishedTime: post.date,
      tags: post.tags,
      images: [{ url: ogImage }],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) notFound();

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <article className="launch-container blog-post-page">
        <header className="blog-post-header">
          <a href="/blog" className="blog-back-link">Blog</a>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <p className="blog-post-author">By Ummar Ahmed</p>
          <h1>{post.title}</h1>
          <p>{post.description}</p>
          {post.tags.length > 0 && (
            <div className="blog-tag-row">
              {post.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          )}
        </header>

        {post.coverImage && (
          <div className="blog-post-cover">
            <Image src={post.coverImage} alt={post.title} width={1200} height={600} loading="lazy" />
          </div>
        )}

        <div className="blog-post-prose">
          <MDXRemote source={post.content} />
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
