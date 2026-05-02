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

export async function analyzeWithAI(
  data: ExtractedData
): Promise<AIAnalysis> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey && !openaiKey) {
    throw new Error("No AI API keys set");
  }

  const userMessage = buildUserMessage(data);
  let raw = "";

  if (geminiKey) {
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
    raw = response.text || "";
  } else if (openaiKey) {
    const client = new OpenAI({ apiKey: openaiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });
    raw = completion.choices[0]?.message?.content?.trim() ?? "";
  }

  // Strip potential markdown fences
  const cleaned = raw.replace(/^```json?\n?/i, "").replace(/```$/i, "").trim();

  const parsed = JSON.parse(cleaned) as AIAnalysis;
  return parsed;
}
