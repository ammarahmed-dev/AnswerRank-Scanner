/** Free tools that fix a specific failing check; shown as links inside the matching report issue. */
export type ToolLink = { href: string; label: string };

const AI_CRAWLER_TOOL: ToolLink = { href: "/tools/ai-crawler-checker", label: "Check which AI crawlers your robots.txt blocks" };
const EXTRACTABILITY_TOOL: ToolLink = { href: "/tools/content-extractability", label: "Test which sections AI engines can quote" };

const ROBOTS_GENERATOR: ToolLink = { href: "/tools/robots-txt-generator", label: "Generate a robots.txt with an AI crawler policy" };
const ORG_SCHEMA_TOOL: ToolLink = { href: "/tools/organization-schema-generator", label: "Generate Organization schema free" };
const META_TOOL: ToolLink = { href: "/tools/meta-tag-checker", label: "Check this page's meta tags with live previews" };
const ARTICLE_SCHEMA_TOOL: ToolLink = { href: "/tools/article-schema-generator", label: "Generate Article schema free" };
const SCHEMA_TOOL: ToolLink = { href: "/tools/schema-checker", label: "Inspect this page's schema markup" };

export const TOOLS_FOR_CHECK: Record<string, ToolLink[]> = {
  llms_txt: [{ href: "/tools/llms-txt-generator", label: "Generate your llms.txt free" }],
  ai_bot_access: [AI_CRAWLER_TOOL, ROBOTS_GENERATOR],
  robots: [AI_CRAWLER_TOOL, ROBOTS_GENERATOR],
  faq_schema: [{ href: "/tools/faq-schema-generator", label: "Build FAQ schema free" }],
  schema_present: [SCHEMA_TOOL, ORG_SCHEMA_TOOL],
  article_schema: [SCHEMA_TOOL, ARTICLE_SCHEMA_TOOL],
  structured_density: [SCHEMA_TOOL, ORG_SCHEMA_TOOL],
  sitemap: [{ href: "/tools/sitemap-checker", label: "Validate your sitemap.xml free" }],
  title: [META_TOOL],
  meta_desc: [META_TOOL],
  canonical: [META_TOOL],
  og_tags: [META_TOOL],
  og_image: [META_TOOL],
  qa_structure: [EXTRACTABILITY_TOOL],
  heading_structure: [EXTRACTABILITY_TOOL],
};

export function toolsForCheck(checkId: string): ToolLink[] {
  return TOOLS_FOR_CHECK[checkId] ?? [];
}
