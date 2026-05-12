import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://aeocheck.co/",
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: "https://aeocheck.co/privacy-policy",
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: "https://aeocheck.co/terms-of-service",
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
