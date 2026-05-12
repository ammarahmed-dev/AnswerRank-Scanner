/**
 * AI Prompt Builder
 * Constructs optimized prompts for AI analysis
 */

import { ScrapedData } from "@/types/index";

type AIPromptContext = {
  overallScore: number;
  detectedSchemas: string[];
  missingSchemas: string[];
  scores: {
    metadata?: number;
    schema?: number;
    headings?: number;
    trustSignals?: number;
  };
  issues: string[];
};

export function buildAIPrompt(data: ScrapedData, context?: AIPromptContext): string {
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

  const contextBlock = context
    ? `You are analyzing the AEO readiness of a webpage.

Here are the ACTUAL scan results already computed:
- Overall score: ${context.overallScore}
- Detected schema types: ${context.detectedSchemas.join(", ") || "None"}
- Missing schema types: ${context.missingSchemas.join(", ") || "None"}
- Metadata score: ${context.scores.metadata ?? "N/A"}
- Schema score: ${context.scores.schema ?? "N/A"}
- Headings score: ${context.scores.headings ?? "N/A"}
- Trust signals score: ${context.scores.trustSignals ?? "N/A"}
- Issues found: ${context.issues.join(", ") || "None"}

Based ONLY on the data above (do not invent new issues):
1. Write a 2-sentence summary of what AI engines will see when they scan this page.
2. Identify ONE specific missing context item based on actual missing schema or low scores only.
3. Suggest ONE next best improvement based on the highest-impact missing item.

Rules:
- NEVER mention a schema type as missing if it appears in detectedSchemas.
- Base missingContext on actual low scores or real missing items only.
- Keep each field under 2 sentences.
`
    : "";

  const prompt = `${contextBlock}
Analyze this website page for AI search visibility and return ONLY a JSON object with no markdown, no code fences, and no extra text.

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

SCHEMA ANALYSIS INSTRUCTIONS:
Based on the detected schema types above and the actual page content, determine:
1. Which schema types are missing that would benefit THIS specific page?
   - Only suggest FAQPage if FAQ or Q&A content is present in the headings or body text
   - Only suggest Article or BlogPosting if this is clearly a blog post or article
   - Only suggest Product if product name, price, or product description is found
   - Only suggest HowTo if step-by-step instructions are present
   - Only suggest Person if author or team member information is present
   - Always consider: Organization, WebSite, WebPage, BreadcrumbList as baseline candidates
2. Which single missing type should be added first (highest impact)?
3. Write specific reasoning referencing actual content found on this page, not generic advice.
4. Do not include a schema type in "missing" if it is already present in "detected".

Return ONLY this exact JSON structure (no markdown, no preamble):
{
  "recommendations": ["specific improvement 1", "specific improvement 2", "specific improvement 3", "specific improvement 4", "specific improvement 5"],
  "quickWin": "single most impactful quick fix",
  "contentGap": "one content gap based on heading structure",
  "summary": "2 sentences on the page's AI discoverability",
  "schemaRecommendations": {
    "detected": ["list", "of", "detected", "schema", "types"],
    "missing": ["specific", "types", "this", "page", "needs"],
    "priority": "SingleMostImportantType",
    "reasoning": "Specific reasoning referencing actual content found on this page."
  }
}`;

  return prompt;
}
