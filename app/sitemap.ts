import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = getAllPosts();

  const blogPosts = posts.map((post) => ({
    url: `https://aeocheck.co/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    {
      url: "https://aeocheck.co/",
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: "https://aeocheck.co/blog",
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: "https://aeocheck.co/privacy-policy",
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: "https://aeocheck.co/terms-of-service",
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: "https://aeocheck.co/refund-policy",
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: "https://aeocheck.co/vs/otterly",
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: "https://aeocheck.co/vs/semrush-ai",
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: "https://aeocheck.co/vs/peec-ai",
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: "https://aeocheck.co/vs/profound",
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    ...blogPosts,
  ];
}