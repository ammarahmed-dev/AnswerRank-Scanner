import type { MetadataRoute } from "next";
import { getAllBlogPosts } from "@/lib/blog";
import { COMPETITOR_SLUGS } from "@/app/vs/competitors";
import { SITE_URL } from "@/lib/seo";
import topicalMap from "@/content/topical-map.json";

type TopicalSlot = { slug: string; status?: string };
const redirectedSlugs = new Set(
  (topicalMap.slots as TopicalSlot[])
    .filter((entry) => entry.status === "redirected")
    .map((entry) => entry.slug)
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = getAllBlogPosts().filter((post) => !redirectedSlugs.has(post.slug));

  const blogPosts = posts.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const comparisonPages = COMPETITOR_SLUGS.map((slug) => ({
    url: `${SITE_URL}/vs/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly" as const, priority: 1.0 },
    { url: `${SITE_URL}/pricing`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${SITE_URL}/team`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${SITE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${SITE_URL}/tools`, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${SITE_URL}/tools/llms-txt-generator`, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${SITE_URL}/tools/ai-crawler-checker`, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${SITE_URL}/tools/faq-schema-generator`, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${SITE_URL}/sample-report`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${SITE_URL}/sitemap`, lastModified: new Date(), changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${SITE_URL}/privacy-policy`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${SITE_URL}/terms-of-service`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${SITE_URL}/refund-policy`, lastModified: new Date(), changeFrequency: "yearly" as const, priority: 0.3 },
    ...comparisonPages,
    ...blogPosts,
  ];
}
