export interface ExtractedData {
  pageTitle: string;
  metaDescription: string;
  h1Tags: string[];
  h2Tags: string[];
  canonicalUrl: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
  jsonLdBlocks: object[];
  schemaTypes: string[];
  imageCount: number;
  imagesMissingAlt: number;
  internalLinks: number;
  externalLinks: number;
  bodyText: string;
}

export interface ScoreBreakdown {
  metadata: number;
  headings: number;
  schema: number;
  contentClarity: number;
  aiAnswerReadiness: number;
  performance: number;
  total: number;
}

export interface AIAnalysis {
  plainEnglishSummary: string;
  detectedBusinessType: string;
  targetAudience: string;
  detectedEntities: string[];
  missingEntities: string[];
  aiSearchWeaknesses: string[];
  highImpactFixes: string[];
  recommendedFaqs: { question: string; answer: string }[];
  schemaRecommendations: string[];
  finalVerdict: string;
}

export interface AnalysisReport {
  url: string;
  extractedData: ExtractedData;
  scores: ScoreBreakdown;
  aiAnalysis: AIAnalysis;
  pageSpeedScore: number | null;
  integrations: {
    aiProvider: "openai" | "gemini" | "fallback";
    aiPowered: boolean;
    pageSpeedProvider: "google" | "fallback";
    pageSpeedMeasured: boolean;
    notes: string[];
  };
  analysisTimestamp: string;
}

export interface AnalysisError {
  error: string;
  details?: string;
}

