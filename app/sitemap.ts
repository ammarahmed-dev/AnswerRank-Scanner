import type { MetadataRoute } from "next";
import { getAllBlogPosts } from "@/lib/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = getAllBlogPosts();

  const blogPosts = posts.map((post) => ({
    url: `https://www.aeocheck.co/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    { url: "https://www.aeocheck.co/", changeFrequency: "weekly" as const, priority: 1.0 },
    { url: "https://www.aeocheck.co/blog", changeFrequency: "weekly" as const, priority: 0.8 },
    { url: "https://www.aeocheck.co/about", lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7 },
    { url: "https://www.aeocheck.co/team", lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7 },
    { url: "https://www.aeocheck.co/contact", lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.6 },
    { url: "https://www.aeocheck.co/sample-report", lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: "https://www.aeocheck.co/sitemap", lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.4 },
    { url: "https://www.aeocheck.co/pricing", lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.9 },
    { url: "https://www.aeocheck.co/privacy-policy", lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.3 },
    { url: "https://www.aeocheck.co/terms-of-service", lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.3 },
    { url: "https://www.aeocheck.co/refund-policy", lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.3 },
    { url: "https://www.aeocheck.co/vs/otterly", lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: "https://www.aeocheck.co/vs/semrush-ai", lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: "https://www.aeocheck.co/vs/peec-ai", lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: "https://www.aeocheck.co/vs/profound", lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    ...blogPosts,
  ];
}