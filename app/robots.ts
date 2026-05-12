import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/privacy-policy", "/terms-of-service"],
        disallow: ["/dashboard", "/report", "/login", "/signup", "/api"],
      },
      {
        userAgent: "GPTBot",
        allow: ["/", "/pricing", "/privacy-policy", "/terms-of-service"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/pricing", "/privacy-policy", "/terms-of-service"],
      },
      {
        userAgent: "Google-Extended",
        allow: ["/", "/pricing", "/privacy-policy", "/terms-of-service"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/pricing", "/privacy-policy", "/terms-of-service"],
      },
      {
        userAgent: "ClaudeBot",
        allow: ["/", "/pricing", "/privacy-policy", "/terms-of-service"],
      },
      {
        userAgent: "anthropic-ai",
        allow: ["/", "/pricing", "/privacy-policy", "/terms-of-service"],
      },
    ],
    sitemap: "https://aeocheck.co/sitemap.xml",
  };
}
