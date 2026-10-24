import { PUBLIC_TOOL_PAGES } from "@/lib/public-tool-pages";
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
    lastModified: new Date(post.updated ?? post.date),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const comparisonPages = COMPETITOR_SLUGS.map((slug) => ({
    url: `${SITE_URL}/vs/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly" as const, priority: 1.0 },
    { url: `${SITE_URL}/pricing`, changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${SITE_URL}/team`, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${SITE_URL}/ai-seo-audit`, changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${SITE_URL}/research/ai-readiness-study`, changeFrequency: "yearly" as const, priority: 0.8 },
    { url: `${SITE_URL}/tools`, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${SITE_URL}/sample-report`, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${SITE_URL}/sitemap`, changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${SITE_URL}/privacy-policy`, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${SITE_URL}/terms-of-service`, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${SITE_URL}/refund-policy`, changeFrequency: "yearly" as const, priority: 0.3 },
    ...PUBLIC_TOOL_PAGES.map(page => ({ url: `${SITE_URL}${page.href}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...comparisonPages,
    ...blogPosts,
  ];
}
