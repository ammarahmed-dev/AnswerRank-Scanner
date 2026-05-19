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
    "/privacy-policy",
    "/terms-of-service",
    "/refund-policy",
    "/vs/otterly",
    "/vs/semrush-ai",
    "/vs/peec-ai",
    "/vs/profound",
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
