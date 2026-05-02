import { ExtractedData, ScoreBreakdown } from "@/types/report";

const USEFUL_SCHEMA_TYPES = [
  "Organization",
  "Product",
  "Service",
  "Article",
  "FAQPage",
  "BreadcrumbList",
  "WebSite",
  "LocalBusiness",
  "Person",
  "HowTo",
  "Review",
];

const FAQ_KEYWORDS = [
  "faq",
  "frequently asked",
  "question",
  "answer",
  "how do",
  "what is",
  "why should",
  "can i",
  "do you",
];

const AUDIENCE_KEYWORDS = [
  "for",
  "teams",
  "businesses",
  "companies",
  "developers",
  "marketers",
  "agencies",
  "startups",
  "enterprise",
  "professionals",
  "you can",
  "your",
];

export function calculateScores(
  data: ExtractedData,
  pageSpeedScore: number | null
): ScoreBreakdown {
  // 1. Metadata (15 pts)
  let metadata = 0;
  if (data.pageTitle && data.pageTitle.length >= 10 && data.pageTitle.length <= 70) metadata += 5;
  else if (data.pageTitle) metadata += 2;

  if (data.metaDescription && data.metaDescription.length >= 50 && data.metaDescription.length <= 160) metadata += 6;
  else if (data.metaDescription) metadata += 3;

  if (data.canonicalUrl) metadata += 4;

  // 2. Headings (15 pts)
  let headings = 0;
  if (data.h1Tags.length === 1) headings += 9;
  else if (data.h1Tags.length > 1) headings += 4; // multiple H1s is bad
  if (data.h2Tags.length >= 2) headings += 6;
  else if (data.h2Tags.length === 1) headings += 3;

  // 3. Schema (20 pts)
  let schema = 0;
  if (data.jsonLdBlocks.length > 0) schema += 8;
  const usefulFound = data.schemaTypes.filter((t) =>
    USEFUL_SCHEMA_TYPES.includes(t)
  );
  if (usefulFound.length >= 3) schema += 12;
  else if (usefulFound.length === 2) schema += 9;
  else if (usefulFound.length === 1) schema += 5;

  // 4. Content clarity (20 pts)
  let contentClarity = 0;
  const bodyLower = data.bodyText.toLowerCase();
  if (data.bodyText.length > 500) contentClarity += 8;
  else if (data.bodyText.length > 200) contentClarity += 4;

  const hasAudience = AUDIENCE_KEYWORDS.some((kw) => bodyLower.includes(kw));
  if (hasAudience) contentClarity += 6;

  const hasProductDesc =
    data.ogDescription.length > 20 || data.metaDescription.length > 20;
  if (hasProductDesc) contentClarity += 6;

  // 5. AI Answer Readiness (15 pts)
  let aiReadiness = 0;
  const hasFaq = FAQ_KEYWORDS.some((kw) => bodyLower.includes(kw));
  if (hasFaq) aiReadiness += 5;

  const hasFaqSchema = data.schemaTypes.includes("FAQPage");
  if (hasFaqSchema) aiReadiness += 5;

  const hasEntitySignals =
    data.schemaTypes.includes("Organization") ||
    data.schemaTypes.includes("Product") ||
    data.schemaTypes.includes("Service");
  if (hasEntitySignals) aiReadiness += 5;

  // 6. Performance (15 pts)
  let performance = 0;
  if (pageSpeedScore !== null) {
    if (pageSpeedScore >= 90) performance = 15;
    else if (pageSpeedScore >= 75) performance = 12;
    else if (pageSpeedScore >= 50) performance = 8;
    else performance = 4;
  } else {
    // Fallback: estimate based on content signals
    if (data.imagesMissingAlt === 0 && data.imageCount > 0) performance += 4;
    if (data.bodyText.length > 300) performance += 4;
    if (data.canonicalUrl) performance += 3;
    if (data.schemaTypes.length > 0) performance += 4;
  }

  const total = Math.min(
    100,
    metadata + headings + schema + contentClarity + aiReadiness + performance
  );

  return {
    metadata: Math.min(15, metadata),
    headings: Math.min(15, headings),
    schema: Math.min(20, schema),
    contentClarity: Math.min(20, contentClarity),
    aiAnswerReadiness: Math.min(15, aiReadiness),
    performance: Math.min(15, performance),
    total,
  };
}

export function scoreLabelAndColor(total: number): {
  label: string;
  color: string;
  gradient: string;
} {
  if (total >= 85)
    return {
      label: "Excellent",
      color: "#22c55e",
      gradient: "from-emerald-400 to-green-500",
    };
  if (total >= 70)
    return {
      label: "Strong",
      color: "#3b82f6",
      gradient: "from-blue-400 to-indigo-500",
    };
  if (total >= 50)
    return {
      label: "Needs Work",
      color: "#f59e0b",
      gradient: "from-amber-400 to-orange-500",
    };
  return {
    label: "Poor",
    color: "#ef4444",
    gradient: "from-red-400 to-rose-600",
  };
}

export function getFallbackAnalysis(data: ExtractedData, scores: ScoreBreakdown) {
  const weaknesses: string[] = [];
  const fixes: string[] = [];
  const schemaRecs: string[] = [];

  if (scores.metadata < 10) {
    weaknesses.push("Meta title or description is missing or poorly optimized.");
    fixes.push("Add a descriptive meta title (50–70 chars) and meta description (120–155 chars).");
  }
  if (scores.schema < 10) {
    weaknesses.push("No JSON-LD structured data detected.");
    fixes.push("Add Organization and WebSite JSON-LD schema to help AI engines understand your brand.");
    schemaRecs.push("Add `Organization` schema with name, url, logo, and description fields.");
    schemaRecs.push("Add `WebSite` schema with SearchAction to enable sitelinks search box.");
  }
  if (scores.aiAnswerReadiness < 8) {
    weaknesses.push("No FAQ content or FAQ schema found.");
    fixes.push("Create an FAQ section and mark it up with FAQPage JSON-LD schema.");
    schemaRecs.push("Add `FAQPage` schema with at least 5 questions your customers ask.");
  }
  if (data.h1Tags.length === 0) {
    weaknesses.push("No H1 tag detected on the page.");
    fixes.push("Add a clear, keyword-rich H1 heading that describes what your page is about.");
  }
  if (data.imagesMissingAlt > 0) {
    weaknesses.push(`${data.imagesMissingAlt} image(s) are missing alt text.`);
    fixes.push("Add descriptive alt text to all images to improve accessibility and AI indexing.");
  }
  if (!data.canonicalUrl) {
    weaknesses.push("No canonical URL tag found.");
    fixes.push("Add a canonical <link> tag to prevent duplicate content issues.");
  }

  return {
    plainEnglishSummary:
      "This page was analyzed using deterministic checks. Add an OpenAI API key for a full AI-powered analysis.",
    detectedBusinessType: "Unknown — add OpenAI key for AI detection",
    targetAudience: "Unknown — add OpenAI key for AI detection",
    detectedEntities: data.schemaTypes.length > 0 ? data.schemaTypes : ["None detected"],
    missingEntities: ["OpenAI key required for entity analysis"],
    aiSearchWeaknesses: weaknesses.length > 0 ? weaknesses : ["No critical weaknesses detected."],
    highImpactFixes: fixes.length > 0 ? fixes : ["Your page looks reasonably well-optimized."],
    recommendedFaqs: [
      {
        question: "What does your product/service do?",
        answer: "Add a clear one-sentence answer here based on your offering.",
      },
      {
        question: "Who is this for?",
        answer: "Describe your ideal customer or user persona.",
      },
    ],
    schemaRecommendations:
      schemaRecs.length > 0
        ? schemaRecs
        : ["Your schema setup looks reasonable. Consider adding FAQPage schema."],
    finalVerdict: `Your site scored ${scores.total}/100. ${scores.total >= 70 ? "Good foundation — focus on schema and FAQ content to boost AI visibility." : "Significant gaps in schema, metadata, or content clarity are limiting AI discoverability."}`,
  };
}
