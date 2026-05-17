/**
 * Deterministic Scoring Engine
 * Implements all SEO/AEO checks for AEOCheck
 */

import { ScrapedData, CheckResult } from "@/types/index";

type CheckStatus = CheckResult["status"];

function hasFaqContent(data: ScrapedData): boolean {
  const headingText = data.headings.map((h) => h.replace(/^H\d+:\s*/, "")).join(" ");
  return /\?|faq|question|how to|what is|why |when /i.test(headingText) ||
    /faq|frequently asked/i.test(data.bodyText.slice(0, 2000));
}

function hasArticleContent(data: ScrapedData): boolean {
  const h2Count = data.headings.filter((h) => h.startsWith("H2:")).length;
  const titleLower = (data.title ?? "").toLowerCase();
  const descLower = (data.metaDescription ?? "").toLowerCase();
  return h2Count >= 3 ||
    /blog|article|guide|tutorial|post|news|how.?to/i.test(titleLower) ||
    /blog|article|guide|tutorial/i.test(descLower);
}

type CheckConfig = {
  id: string;
  label: string;
  weight: number;
  check: (data: ScrapedData) => CheckStatus;
  detail: (data: ScrapedData) => string;
};

const CHECKS_CONFIG: CheckConfig[] = [
  {
    id: "title",
    label: "Page Title",
    weight: 8,
    check: (data: ScrapedData) => {
      const len = data.title?.length ?? 0;
      if (!data.title) return "fail";
      if (len >= 30 && len <= 60) return "pass";
      if (len >= 20 && len <= 70) return "warn";
      return "fail";
    },
    detail: (data: ScrapedData) => {
      const len = data.title?.length ?? 0;
      if (!data.title) return "No page title found";
      if (len >= 30 && len <= 60) return `Optimal title (${len} chars)`;
      if (len < 30) return `Title too short (${len} chars, target 30-60)`;
      return `Title too long (${len} chars, target 30-60)`;
    },
  },
  {
    id: "meta_desc",
    label: "Meta Description",
    weight: 8,
    check: (data: ScrapedData) => {
      const len = data.metaDescription?.length ?? 0;
      if (!data.metaDescription) return "fail";
      if (len >= 120 && len <= 160) return "pass";
      if (len >= 100 && len <= 170) return "warn";
      return "fail";
    },
    detail: (data: ScrapedData) => {
      const len = data.metaDescription?.length ?? 0;
      if (!data.metaDescription) return "No meta description";
      if (len >= 120 && len <= 160) return `Optimal description (${len} chars)`;
      if (len < 120) return `Description too short (${len} chars, target 120-160)`;
      return `Description too long (${len} chars, target 120-160)`;
    },
  },
  {
    id: "h1",
    label: "H1 Tag",
    weight: 8,
    check: (data: ScrapedData) => {
      const h1Count = data.headings.filter((h) => h.startsWith("H1:"))?.length ?? 0;
      if (h1Count === 1) return "pass";
      if (h1Count === 0) return "fail";
      return "warn";
    },
    detail: (data: ScrapedData) => {
      const h1Count = data.headings.filter((h) => h.startsWith("H1:"))?.length ?? 0;
      if (h1Count === 0) return "No H1 tag found";
      if (h1Count === 1) return "Exactly 1 H1 tag (optimal)";
      return `${h1Count} H1 tags found (should be exactly 1)`;
    },
  },
  {
    id: "heading_structure",
    label: "Heading Hierarchy",
    weight: 5,
    check: (data: ScrapedData) => {
      const h2Count = data.headings.filter((h) => h.startsWith("H2:"))?.length ?? 0;
      const h3Count = data.headings.filter((h) => h.startsWith("H3:"))?.length ?? 0;
      // H2s should exist if H3s exist (proper hierarchy)
      if (h3Count > 0 && h2Count === 0) return "fail";
      if (h2Count > 0) return "pass";
      if (h2Count === 0 && h3Count === 0) return "warn";
      return "pass";
    },
    detail: (data: ScrapedData) => {
      const h2Count = data.headings.filter((h) => h.startsWith("H2:"))?.length ?? 0;
      const h3Count = data.headings.filter((h) => h.startsWith("H3:"))?.length ?? 0;
      if (h3Count > 0 && h2Count === 0)
        return "H3 found without H2 (breaks hierarchy)";
      if (h2Count > 0) return `Good structure with ${h2Count} H2 and ${h3Count} H3 tags`;
      return "No H2/H3 hierarchy detected";
    },
  },
  {
    id: "schema_present",
    label: "Schema Markup",
    weight: 10,
    check: (data: ScrapedData) => {
      if (data.schemaBlocks > 0) return "pass";
      return "fail";
    },
    detail: (data: ScrapedData) => {
      if (data.schemaBlocks === 0) return "No JSON-LD schema detected";
      return `${data.schemaBlocks} schema block${data.schemaBlocks > 1 ? "s" : ""} found`;
    },
  },
  {
    id: "faq_schema",
    label: "FAQ Schema",
    weight: 10,
    check: (data: ScrapedData) => {
      if (data.schemaTypes.includes("FAQPage")) return "pass";
      if (hasFaqContent(data)) return "warn";
      return "pass"; // not applicable - no FAQ content on page
    },
    detail: (data: ScrapedData) => {
      if (data.schemaTypes.includes("FAQPage"))
        return "FAQPage schema present (excellent for AI)";
      if (hasFaqContent(data))
        return "Page has Q&A content but no FAQPage schema - high-impact addition";
      return "No FAQ content detected - FAQPage schema not required";
    },
  },
  {
    id: "article_schema",
    label: "Article/HowTo Schema",
    weight: 7,
    check: (data: ScrapedData) => {
      const hasArticleSchema =
        data.schemaTypes.includes("Article") ||
        data.schemaTypes.includes("HowTo") ||
        data.schemaTypes.includes("NewsArticle") ||
        data.schemaTypes.includes("BlogPosting");
      if (hasArticleSchema) return "pass";
      if (hasArticleContent(data)) return "warn";
      return "pass"; // not applicable - no article structure on page
    },
    detail: (data: ScrapedData) => {
      const articleTypes = data.schemaTypes.filter((t) =>
        ["Article", "HowTo", "NewsArticle", "BlogPosting"].includes(t)
      );
      if (articleTypes.length > 0)
        return `${articleTypes.join(", ")} schema present`;
      if (hasArticleContent(data))
        return "Page has article/blog structure but no Article-type schema";
      return "No article/blog structure detected - Article schema not required";
    },
  },
  {
    id: "og_tags",
    label: "Open Graph Tags",
    weight: 6,
    check: (data: ScrapedData) => {
      const hasOgTitle = Boolean(data.ogTitle);
      const hasOgDesc = Boolean(data.ogDescription);
      if (hasOgTitle && hasOgDesc) return "pass";
      if (hasOgTitle || hasOgDesc) return "warn";
      return "fail";
    },
    detail: (data: ScrapedData) => {
      const tags = [];
      if (data.ogTitle) tags.push("og:title");
      if (data.ogDescription) tags.push("og:description");
      if (tags.length === 2) return "og:title and og:description present";
      if (tags.length === 1) return `Only ${tags[0]} present`;
      return "No Open Graph tags found";
    },
  },
  {
    id: "og_image",
    label: "OG Image",
    weight: 4,
    check: (data: ScrapedData) => {
      if (data.ogImage) return "pass";
      return "warn";
    },
    detail: (data: ScrapedData) => {
      if (data.ogImage) return "og:image present for social sharing";
      return "og:image not set";
    },
  },
  {
    id: "https",
    label: "HTTPS",
    weight: 8,
    check: (data: ScrapedData) => {
      if (data.url.startsWith("https://")) return "pass";
      return "fail";
    },
    detail: (data: ScrapedData) => {
      if (data.url.startsWith("https://")) return "HTTPS enabled (secure)";
      return "Not using HTTPS (security risk)";
    },
  },
  {
    id: "robots",
    label: "Robots.txt",
    weight: 5,
    check: (data: ScrapedData) => {
      if (data.hasRobotsTxt === true) return "pass";
      if (data.hasRobotsTxt === false) return "fail";
      return "warn";
    },
    detail: (data: ScrapedData) => {
      if (data.hasRobotsTxt === true) return "robots.txt found and accessible";
      if (data.hasRobotsTxt === false) return "No robots.txt found";
      return "robots.txt could not be verified";
    },
  },
  {
    id: "ai_bot_access",
    label: "AI Crawler Access (GEO)",
    weight: 8,
    check: (data: ScrapedData) => {
      if (data.allowsAiBots === true) return "pass";
      if (data.allowsAiBots === false) return "fail";
      return "warn";
    },
    detail: (data: ScrapedData) => {
      if (data.allowsAiBots === true) return "Major AI crawlers (GPTBot, ClaudeBot, PerplexityBot) are allowed";
      if (data.allowsAiBots === false) return "One or more AI crawlers blocked in robots.txt - this prevents AI indexing";
      return "AI bot access could not be verified";
    },
  },
  {
    id: "sitemap",
    label: "Sitemap.xml",
    weight: 5,
    check: (data: ScrapedData) => {
      if (data.hasSitemap === true) return "pass";
      if (data.hasSitemap === false) return "warn";
      return "warn";
    },
    detail: (data: ScrapedData) => {
      if (data.hasSitemap === true) return "sitemap.xml found - helps AI crawlers discover all pages";
      return "No sitemap.xml found at /sitemap.xml";
    },
  },
  {
    id: "llms_txt",
    label: "llms.txt File (GEO)",
    weight: 9,
    check: (data: ScrapedData) => {
      if (data.hasLlmsTxt === true) return "pass";
      if (data.hasLlmsTxt === false) return "fail";
      return "warn";
    },
    detail: (data: ScrapedData) => {
      if (data.hasLlmsTxt === true) return "llms.txt found - AI engines can read your site structure";
      if (data.hasLlmsTxt === false) return "No llms.txt file - add one to help AI engines understand your site";
      return "llms.txt could not be verified";
    },
  },
  {
    id: "alt_text",
    label: "Image Alt Text",
    weight: 6,
    check: (data: ScrapedData) => {
      if (data.images.length === 0) return "pass"; // No images = pass
      const altRatio =
        data.images.filter((img) => img.hasAlt).length /
        data.images.length;
      if (altRatio >= 0.8) return "pass";
      if (altRatio >= 0.5) return "warn";
      return "fail";
    },
    detail: (data: ScrapedData) => {
      if (data.images.length === 0) return "No images found";
      const altCount = data.images.filter((img) => img.hasAlt).length;
      const pct = Math.round((altCount / data.images.length) * 100);
      return `${altCount}/${data.images.length} images have alt text (${pct}%)`;
    },
  },
  {
    id: "word_count",
    label: "Content Length",
    weight: 7,
    check: (data: ScrapedData) => {
      if (data.wordCount >= 300) return "pass";
      if (data.wordCount >= 150) return "warn";
      return "fail";
    },
    detail: (data: ScrapedData) => {
      if (data.wordCount >= 300) return `Good content length (${data.wordCount} words)`;
      if (data.wordCount >= 150) return `Moderate content (${data.wordCount} words, target 300+)`;
      return `Thin content (${data.wordCount} words, target 300+)`;
    },
  },
  {
    id: "internal_links",
    label: "Internal Links",
    weight: 4,
    check: (data: ScrapedData) => {
      if (data.internalLinks > 3) return "pass";
      if (data.internalLinks > 0) return "warn";
      return "fail";
    },
    detail: (data: ScrapedData) => {
      if (data.internalLinks > 3) return `Good link structure (${data.internalLinks} internal links)`;
      if (data.internalLinks > 0)
        return `Few internal links (${data.internalLinks}, target 3+)`;
      return "No internal links found";
    },
  },
  {
    id: "structured_density",
    label: "Schema Density",
    weight: 5,
    check: (data: ScrapedData) => {
      if (data.schemaBlocks > 1) return "pass";
      if (data.schemaBlocks === 1) return "warn";
      return "warn"; // no schema - schema_present already handles this
    },
    detail: (data: ScrapedData) => {
      if (data.schemaBlocks > 1)
        return `Rich schema implementation (${data.schemaBlocks} blocks)`;
      const suggestions: string[] = [];
      if (!data.schemaTypes.includes("Organization")) suggestions.push("Organization");
      if (!data.schemaTypes.includes("WebSite")) suggestions.push("WebSite");
      if (hasFaqContent(data) && !data.schemaTypes.includes("FAQPage")) suggestions.push("FAQPage");
      if (hasArticleContent(data) && !data.schemaTypes.some((t) => ["Article", "HowTo", "NewsArticle", "BlogPosting"].includes(t))) suggestions.push("Article");
      if (data.headings.filter((h) => h.startsWith("H2:")).length > 4 && !data.schemaTypes.includes("BreadcrumbList")) suggestions.push("BreadcrumbList");
      const list = suggestions.length > 0 ? suggestions.join(", ") : "additional content-specific types";
      if (data.schemaBlocks === 1) return `Single schema block - layer more types: ${list}`;
      return `No schema markup - add: ${list}`;
    },
  },
  {
    id: "eeat_author",
    label: "Author / Attribution",
    weight: 7,
    check: (data: ScrapedData) => {
      if (data.hasAuthor) return "pass";
      // Only warn for content-heavy pages
      if ((data.wordCount ?? 0) > 300) return "warn";
      return "pass"; // not applicable for thin pages
    },
    detail: (data: ScrapedData) => {
      if (data.hasAuthor) return "Author attribution detected - good E-E-A-T signal";
      if ((data.wordCount ?? 0) > 300) return "No author attribution found - add byline or Person schema for E-E-A-T";
      return "No author attribution - consider adding for content credibility";
    },
  },
  {
    id: "eeat_about",
    label: "About / Contact Page",
    weight: 8,
    check: (data: ScrapedData) => {
      if (data.hasAboutPage && data.hasContactPage) return "pass";
      if (data.hasAboutPage || data.hasContactPage) return "warn";
      return "warn";
    },
    detail: (data: ScrapedData) => {
      if (data.hasAboutPage && data.hasContactPage) return "About and Contact pages linked - strong trust signals";
      if (data.hasAboutPage) return "About page found but no Contact page linked";
      if (data.hasContactPage) return "Contact page found but no About page linked";
      return "No About or Contact page linked - add both for E-E-A-T";
    },
  },
  {
    id: "eeat_freshness",
    label: "Content Freshness",
    weight: 5,
    check: (data: ScrapedData) => {
      if (!data.datePublished && !data.dateModified) return "warn";
      const dateStr = data.dateModified || data.datePublished || "";
      try {
        const date = new Date(dateStr);
        const ageMonths = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (ageMonths <= 12) return "pass";
        if (ageMonths <= 24) return "warn";
        return "fail";
      } catch {
        return "warn";
      }
    },
    detail: (data: ScrapedData) => {
      if (!data.datePublished && !data.dateModified)
        return "No publish or modified date found - add datePublished/dateModified schema";
      const dateStr = data.dateModified || data.datePublished || "";
      try {
        const date = new Date(dateStr);
        const ageMonths = Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30));
        if (ageMonths <= 12) return `Content is fresh (updated ${ageMonths} months ago)`;
        if (ageMonths <= 24) return `Content is ${ageMonths} months old - consider updating`;
        return `Content is ${ageMonths} months old - AI engines deprioritize stale content`;
      } catch {
        return "Date format unrecognized - use ISO 8601 format (YYYY-MM-DD)";
      }
    },
  },
  {
    id: "readability",
    label: "Content Readability",
    weight: 6,
    check: (data: ScrapedData) => {
      const score = data.readabilityScore ?? -1;
      if (score < 0) return "warn";
      // Flesch scale:
      // 90-100: Very easy (5th grade)
      // 70-90: Easy (6th grade)
      // 60-70: Standard (7th-8th grade) - IDEAL for AEO
      // 50-60: Fairly difficult
      // 30-50: Difficult
      // 0-30: Very difficult
      if (score >= 60) return "pass";
      if (score >= 40) return "warn";
      return "fail";
    },
    detail: (data: ScrapedData) => {
      const score = data.readabilityScore ?? -1;
      if (score < 0) return "Readability could not be calculated";
      if (score >= 70) return `Excellent readability (Flesch score: ${score}/100) - AI engines can easily extract answers`;
      if (score >= 60) return `Good readability (Flesch score: ${score}/100) - content is clear for AI extraction`;
      if (score >= 40) return `Moderate readability (Flesch score: ${score}/100) - simplify sentences for better AI citation`;
      return `Poor readability (Flesch score: ${score}/100) - content is too complex for AI engines to cite effectively`;
    },
  },
  {
    id: "core_web_vitals",
    label: "Core Web Vitals",
    weight: 6,
    check: (_data: ScrapedData) => {
      // Status is overridden in scan/route.ts
      // using actual PageSpeed data
      return "warn";
    },
    detail: () => "Core Web Vitals require PageSpeed API data",
  },
];

export function runDeterministicChecks(
  data: ScrapedData
): CheckResult[] {
  return CHECKS_CONFIG.map((config) => ({
    id: config.id,
    label: config.label,
    status: config.check(data),
    detail: config.detail(data),
    weight: config.weight,
  }));
}

export function calculateScore(checks: CheckResult[]): number {
  if (checks.length === 0) return 0;

  let totalWeight = 0;
  let passedWeight = 0;

  checks.forEach((check) => {
    totalWeight += check.weight;
    if (check.status === "pass") {
      passedWeight += check.weight;
    } else if (check.status === "warn") {
      // Warn counts as 50% credit
      passedWeight += check.weight * 0.5;
    }
  });

  if (totalWeight === 0) return 0;

  const score = Math.round((passedWeight / totalWeight) * 100);
  return Math.min(100, Math.max(0, score));
}


