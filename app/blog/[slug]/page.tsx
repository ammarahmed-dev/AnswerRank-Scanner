import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import { getAllBlogPosts, getBlogPost } from "@/lib/blog";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";

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
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const ogImage = post.coverImage
    ? post.coverImage.startsWith("http")
      ? post.coverImage
      : absoluteUrl(post.coverImage)
    : DEFAULT_OG_IMAGE;

  return {
    title: `${post.title} - AEOCheck`,
    description: post.description,
    keywords: post.tags,
    alternates: {
      canonical: `https://www.aeocheck.co/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url: `${SITE_URL}/blog/${post.slug}`,
      siteName: SITE_NAME,
      publishedTime: post.date,
      tags: post.tags,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);

  if (!post) notFound();

  const postUrl = `${SITE_URL}/blog/${slug}`;
  const imageUrl = post.coverImage
    ? post.coverImage.startsWith("http")
      ? post.coverImage
      : absoluteUrl(post.coverImage)
    : DEFAULT_OG_IMAGE;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.description,
        image: imageUrl,
        datePublished: post.date,
        dateModified: post.date,
        author: {
          "@type": "Person",
          name: "Ummar Ahmed",
          url: "https://www.linkedin.com/in/ummar-ahmed/",
          sameAs: ["https://www.linkedin.com/in/ummar-ahmed/"],
        },
        publisher: {
          "@type": "Organization",
          name: "AEOCheck",
          logo: {
            "@type": "ImageObject",
            url: `${SITE_URL}/icons/icon-512.png`,
          },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": postUrl,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://www.aeocheck.co" },
          { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.aeocheck.co/blog" },
          { "@type": "ListItem", position: 3, name: post.title, item: postUrl },
        ],
      },
      ...(post.faqs?.length
        ? [
            {
              "@type": "FAQPage",
              mainEntity: post.faqs.map((faq) => ({
                "@type": "Question",
                name: faq.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: faq.answer,
                },
              })),
            },
          ]
        : []),
    ],
  };

  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <SiteHeader />
      <article className="launch-container blog-post-page">
        <header className="blog-post-header">
          <Link href="/blog" className="blog-back-link">Blog</Link>
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
            <Image src={post.coverImage} alt={post.coverImageAlt ?? post.title} width={1200} height={600} priority quality={80} />
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
