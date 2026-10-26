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

  // Named crawler groups do not inherit the wildcard group's exclusions.
  const sharedDisallow = ["/dashboard", "/report", "/login", "/signup", "/api"];

  return {
    rules: [
      {
        userAgent: "*",
        allow: sharedAllow,
        disallow: sharedDisallow,
      },
      { userAgent: "GPTBot",         allow: sharedAllow, disallow: sharedDisallow },
      { userAgent: "ChatGPT-User",   allow: sharedAllow, disallow: sharedDisallow },
      { userAgent: "Google-Extended", allow: sharedAllow, disallow: sharedDisallow },
      { userAgent: "PerplexityBot",  allow: sharedAllow, disallow: sharedDisallow },
      { userAgent: "ClaudeBot",      allow: sharedAllow, disallow: sharedDisallow },
      { userAgent: "anthropic-ai",   allow: sharedAllow, disallow: sharedDisallow },
    ],
    sitemap: "https://www.aeocheck.co/sitemap.xml",
  };
}
