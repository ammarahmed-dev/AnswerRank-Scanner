import { getAllBlogPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  const posts = getAllBlogPosts();

  const blogLines = posts
    .map((post) => `- ${SITE_URL}/blog/${post.slug}: ${post.title}`)
    .join("\n");

  const body = `# AEOCheck
> AEO and GEO readiness scanner for AI search visibility

AEOCheck audits any public webpage against 25+ Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO) signals. It scores a page on how well it can be understood, extracted, and cited by AI answer engines including ChatGPT, Perplexity, Google AI Overviews, and Microsoft Copilot.

## Checks covered
- Schema markup (JSON-LD presence, FAQPage, Article, Organization)
- Metadata quality (title, meta description, Open Graph tags)
- Heading structure (H1, H2/H3 hierarchy)
- Content clarity (word count, readability, internal links, alt text)
- AI crawler access (GPTBot, PerplexityBot, ClaudeBot allowlisting in robots.txt)
- Trust signals (HTTPS, sitemap, About/Contact pages, author attribution, content freshness)
- AI readiness (llms.txt, E-E-A-T signals, entity signals)
- Performance (Core Web Vitals via PageSpeed API)

## Features
- Scan: free for guests; limited monthly scans for free accounts
- Starter plan: $9 one-time - 1 full report on 1 URL, 3 retests, 50-page audit runs, PDF export
- Pro plan: $19/month - unlimited scans, Compare (side-by-side competitor analysis), Monitor, Audit
- Agency plan: $49/month - everything in Pro, higher limits for managing multiple clients
- Compare: runs AEO scans on two URLs and returns a category-by-category breakdown
- PDF export: client-ready report export from any full report

## Pricing
- Guest: 1 scan, preview score only
- Free account: limited scans per month
- Starter: $9 one-time - 1 full report URL, 3 retests, PDF export
- Pro: $19/month - unlimited scans + Compare, Monitor, Audit features
- Agency: $49/month - unlimited scans + highest limits for agencies

## Key pages
- Homepage and scanner: ${SITE_URL}
- Sample report: ${SITE_URL}/sample-report
- Pricing: ${SITE_URL}/pricing
- Blog: ${SITE_URL}/blog
- About: ${SITE_URL}/about
- Contact: ${SITE_URL}/contact

## Research
- ${SITE_URL}/research/ai-readiness-study: robots.txt, llms.txt and schema signals on 85 well-known sites

## Free tools (no signup)
- ${SITE_URL}/ai-seo-audit: free AI SEO audit of any URL (25 checks)
- ${SITE_URL}/tools: all free tools
- ${SITE_URL}/tools/llms-txt-generator: generate an llms.txt file from a site's key pages
- ${SITE_URL}/tools/ai-crawler-checker: check which AI crawlers a robots.txt allows or blocks
- ${SITE_URL}/tools/ai-readiness-badge: embeddable AI readiness score badge
- ${SITE_URL}/tools/schema-checker: inspect a page's JSON-LD and missing schema properties
- ${SITE_URL}/tools/content-extractability: test which page sections AI engines can quote
- ${SITE_URL}/tools/faq-schema-generator: generate FAQPage JSON-LD from questions and answers
- ${SITE_URL}/tools/meta-tag-checker: check title, description, canonical and social tags with previews
- ${SITE_URL}/tools/sitemap-checker: validate a sitemap.xml and spot-check its URLs
- ${SITE_URL}/tools/robots-txt-generator: generate a robots.txt with a policy for AI crawlers
- ${SITE_URL}/tools/article-schema-generator: generate Article or BlogPosting JSON-LD
- ${SITE_URL}/tools/organization-schema-generator: generate Organization and WebSite JSON-LD

## Blog posts
${blogLines}

## Do not index
- /api/*
- /dashboard
- /admin
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
