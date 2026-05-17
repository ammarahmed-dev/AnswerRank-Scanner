import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const sharedAllow = [
    "/",
    "/blog",
    "/about",
    "/team",
    "/sample-report",
    "/sitemap",
    "/contact",
    "/pricing",
    "/privacy-policy",
    "/terms-of-service",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: sharedAllow,
        disallow: ["/dashboard", "/report", "/login", "/signup", "/api"],
      },
      { userAgent: "GPTBot",         allow: sharedAllow },
      { userAgent: "ChatGPT-User",   allow: sharedAllow },
      { userAgent: "Google-Extended", allow: sharedAllow },
      { userAgent: "PerplexityBot",  allow: sharedAllow },
      { userAgent: "ClaudeBot",      allow: sharedAllow },
      { userAgent: "anthropic-ai",   allow: sharedAllow },
    ],
    sitemap: "https://www.aeocheck.co/sitemap.xml",
  };
}
