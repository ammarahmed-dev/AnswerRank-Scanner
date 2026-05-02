/**
 * AI Prompt Builder
 * Constructs optimized prompts for AI analysis
 */

import { ScrapedData } from "@/types/index";

export function buildAIPrompt(data: ScrapedData): string {
  const maxInputChars = Number(process.env.AI_MAX_INPUT_CHARS ?? 3500);

  // Clean and truncate body text
  const cleanedBodyText = data.bodyText
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxInputChars);

  // Build compact prompt
  const schemaTypesList = data.schemaTypes.join(", ") || "None";
  const headingsList =
    data.headings.slice(0, 15).join(" | ") || "None";

  const prompt = `Analyze this website page for AI search visibility and return ONLY a JSON object with no markdown, no code fences, and no extra text.

URL: ${data.url}
TITLE: ${data.title || "None"}
META DESCRIPTION: ${data.metaDescription || "None"}
OG TITLE: ${data.ogTitle || "None"}
OG DESCRIPTION: ${data.ogDescription || "None"}
HEADINGS: ${headingsList}
SCHEMA TYPES DETECTED: ${schemaTypesList}
INTERNAL LINKS: ${data.internalLinks}
WORD COUNT: ${data.wordCount}
IMAGES WITH ALT TEXT: ${data.images.filter((img) => img.hasAlt).length}/${data.images.length}

BODY TEXT (first ${maxInputChars} chars):
${cleanedBodyText}

Return ONLY this exact JSON structure (no markdown, no preamble):
{
  "recommendations": ["specific improvement 1", "specific improvement 2", "specific improvement 3", "specific improvement 4", "specific improvement 5"],
  "quickWin": "single most impactful quick fix",
  "contentGap": "one content gap based on heading structure",
  "summary": "2 sentences on the page's AI discoverability"
}`;

  return prompt;
}
