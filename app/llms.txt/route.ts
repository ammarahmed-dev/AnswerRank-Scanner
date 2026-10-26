import { getAllBlogPosts } from "@/lib/blog";
import topicalMap from "@/content/topical-map.json";
import { SERVICES_PATH } from "@/lib/service-enquiry";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";
export const revalidate = 3600;

export function GET() {
  const redirected = new Set(topicalMap.slots.filter(slot => slot.status === "redirected").map(slot => slot.slug));
  const posts = getAllBlogPosts().filter(post => !redirected.has(post.slug));

  const blogLines = posts
    .map((post) => `- ${SITE_URL}/blog/${post.slug}: ${post.title}`)
    .join("\n");

  const body = `# AEOCheck
> AEO and GEO readiness scanner for AI search visibility

AEOCheck runs 25 deterministic checks on a public webpage across metadata, structured data, content, trust, crawler access and lab performance. The score describes page readiness for AI search; it does not measure actual inclusion, citations or rankings in ChatGPT, Perplexity, Google AI Overviews or other answer engines. Optional generated recommendations supplement the checks.

## Checks covered
- Schema markup (JSON-LD presence, FAQPage, Article, Organization)
- Metadata quality (title, meta description, Open Graph tags)
- Heading structure (H1, H2/H3 hierarchy)
- Content clarity (word count, readability, internal links, alt text)
- AI crawler access (path-specific robots.txt policy, distinguishing search crawlers, training crawlers and user-request agents)
- Trust signals (HTTPS, sitemap, About/Contact pages, author attribution, content freshness)
- AI readiness (llms.txt, E-E-A-T signals, entity signals)
- Lab performance (PageSpeed/Lighthouse measurements when available; not a real-user Core Web Vitals assessment)

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
- Implementation services: ${SITE_URL}${SERVICES_PATH}

## Implementation services
Scoped technical SEO, applicable structured-data and existing-page content improvements. The service page lists deliverables and starting prices; final scope is agreed in a proposal. Implementation services are separate from scanner subscriptions. Readiness improvements do not guarantee rankings or AI citations.

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
- ${SITE_URL}/tools/robots-txt-tester: test whether a URL is allowed or blocked for any crawler
- ${SITE_URL}/tools/open-graph-checker: check Open Graph and Twitter card tags with a social preview
- ${SITE_URL}/tools/faq-schema-validator: validate FAQPage structured data on a page
- ${SITE_URL}/tools/sitemap-checker: validate a sitemap.xml and spot-check its URLs
- ${SITE_URL}/tools/robots-txt-generator: generate a robots.txt with a policy for AI crawlers
- ${SITE_URL}/tools/article-schema-generator: generate Article or BlogPosting JSON-LD
- ${SITE_URL}/tools/organization-schema-generator: generate Organization and WebSite JSON-LD

## Blog posts
${blogLines}

## Access and indexing policy
Crawl instructions are published in robots.txt; page-level robots directives and authentication are enforced separately. This file is descriptive and does not control indexing or grant access.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
