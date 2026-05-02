import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { ExtractedData, AIAnalysis } from "@/types/report";

const SYSTEM_PROMPT = `You are an expert SEO and AI search visibility analyst. 
You analyze website data extracted from HTML and return a structured JSON report.
Rules:
- Only infer from the provided page content. Do NOT invent facts.
- If something is unclear from the page content, say "unclear from page content".
- Be concise but specific. Avoid generic advice.
- Return valid JSON only. No markdown, no code fences, no extra text.`;

function buildUserMessage(data: ExtractedData): string {
  return `Analyze this website data and return a JSON report:

PAGE TITLE: ${data.pageTitle || "None"}
META DESCRIPTION: ${data.metaDescription || "None"}
H1 TAGS: ${data.h1Tags.join(" | ") || "None"}
H2 TAGS: ${data.h2Tags.slice(0, 10).join(" | ") || "None"}
OG TITLE: ${data.ogTitle || "None"}
OG DESCRIPTION: ${data.ogDescription || "None"}
CANONICAL URL: ${data.canonicalUrl || "None"}
SCHEMA TYPES DETECTED: ${data.schemaTypes.join(", ") || "None"}
IMAGE COUNT: ${data.imageCount}
IMAGES MISSING ALT: ${data.imagesMissingAlt}
INTERNAL LINKS: ${data.internalLinks}
EXTERNAL LINKS: ${data.externalLinks}

BODY TEXT (first 4000 chars):
${data.bodyText.slice(0, 4000)}

Return ONLY this JSON structure (no code fences):
{
  "plainEnglishSummary": "2-3 sentence summary of what this page is and what it does",
  "detectedBusinessType": "e.g. SaaS, E-commerce, Agency, Blog, etc.",
  "targetAudience": "who this page is for, based only on content",
  "detectedEntities": ["list of brands, products, people, or concepts mentioned"],
  "missingEntities": ["important entities that are missing and would help AI engines"],
  "aiSearchWeaknesses": ["specific weaknesses hurting AI search visibility"],
  "highImpactFixes": ["top 5 specific, actionable fixes ordered by impact"],
  "recommendedFaqs": [
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."}
  ],
  "schemaRecommendations": ["specific schema types and fields to add"],
  "finalVerdict": "1-2 sentence overall verdict on AI visibility readiness"
}`;
}

function asStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return cleaned.length ? cleaned : fallback;
}

function normalizeAnalysis(value: Partial<AIAnalysis>): AIAnalysis {
  const recommendedFaqs = Array.isArray(value.recommendedFaqs)
    ? value.recommendedFaqs
        .filter((faq): faq is { question: string; answer: string } =>
          typeof faq?.question === "string" && typeof faq?.answer === "string"
        )
        .slice(0, 10)
    : [];

  return {
    plainEnglishSummary: typeof value.plainEnglishSummary === "string" ? value.plainEnglishSummary : "Analysis completed with limited AI output.",
    detectedBusinessType: typeof value.detectedBusinessType === "string" ? value.detectedBusinessType : "Unclear from page content",
    targetAudience: typeof value.targetAudience === "string" ? value.targetAudience : "Unclear from page content",
    detectedEntities: asStringArray(value.detectedEntities, ["None detected"]),
    missingEntities: asStringArray(value.missingEntities, ["Add clearer brand, product, and audience entities."]),
    aiSearchWeaknesses: asStringArray(value.aiSearchWeaknesses, ["No critical weaknesses returned by AI analysis."]),
    highImpactFixes: asStringArray(value.highImpactFixes, ["Improve metadata, schema, and FAQ content for AI answer readiness."]),
    recommendedFaqs: recommendedFaqs.length
      ? recommendedFaqs
      : [{ question: "What does this page offer?", answer: "Add a direct, customer-facing answer based on the page content." }],
    schemaRecommendations: asStringArray(value.schemaRecommendations, ["Add Organization, WebSite, and FAQPage schema where relevant."]),
    finalVerdict: typeof value.finalVerdict === "string" ? value.finalVerdict : "The page has usable signals, but schema and answer-ready content can be improved.",
  };
}

export async function analyzeWithAI(
  data: ExtractedData
): Promise<{ analysis: AIAnalysis; provider: "openai" | "gemini" }> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey && !openaiKey) {
    throw new Error("No AI API keys set");
  }

  const userMessage = buildUserMessage(data);
  const errors: string[] = [];

  if (openaiKey) {
    try {
      const client = new OpenAI({ apiKey: openaiKey });
      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });
      const raw = completion.choices[0]?.message?.content?.trim() ?? "";
      return parseProviderResponse(raw, "openai");
    } catch (err: unknown) {
      errors.push(`OpenAI failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + userMessage }] }
        ],
        config: {
            temperature: 0.3,
            responseMimeType: "application/json",
        }
      });
      return parseProviderResponse(response.text || "", "gemini");
    } catch (err: unknown) {
      errors.push(`Gemini failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  throw new Error(errors.join(" | ") || "No AI provider returned a valid response.");
}

function parseProviderResponse(raw: string, provider: "openai" | "gemini"): { analysis: AIAnalysis; provider: "openai" | "gemini" } {
  // Strip potential markdown fences
  const cleaned = raw.replace(/^```json?\n?/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as Partial<AIAnalysis>;
  return { analysis: normalizeAnalysis(parsed), provider };
}
