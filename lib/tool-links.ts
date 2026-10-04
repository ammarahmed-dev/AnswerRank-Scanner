/** Free tools that fix a specific failing check; shown as a link inside the matching report issue. */
export type ToolLink = { href: string; label: string };

const AI_CRAWLER_TOOL: ToolLink = { href: "/tools/ai-crawler-checker", label: "Check which AI crawlers your robots.txt blocks" };
const EXTRACTABILITY_TOOL: ToolLink = { href: "/tools/content-extractability", label: "Test which sections AI engines can quote" };

export const TOOL_FOR_CHECK: Record<string, ToolLink> = {
  llms_txt: { href: "/tools/llms-txt-generator", label: "Generate your llms.txt free" },
  ai_bot_access: AI_CRAWLER_TOOL,
  robots: AI_CRAWLER_TOOL,
  faq_schema: { href: "/tools/faq-schema-generator", label: "Build FAQ schema free" },
  qa_structure: EXTRACTABILITY_TOOL,
  heading_structure: EXTRACTABILITY_TOOL,
};

export function toolForCheck(checkId: string): ToolLink | null {
  return TOOL_FOR_CHECK[checkId] ?? null;
}
