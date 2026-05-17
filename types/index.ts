export interface ScrapedData {
  url: string;
  title: string;
  metaDescription: string;
  canonical: string;
  headings: string[]; // all H1-H3 text content
  schemaTypes: string[]; // detected @type values from JSON-LD
  schemaBlocks: number; // count of JSON-LD script tags
  bodyText: string; // visible body text, nav/footer stripped
  images: { hasAlt: boolean }[];
  internalLinks: number;
  wordCount: number;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  hasAuthor?: boolean;
  hasAboutPage?: boolean;
  hasContactPage?: boolean;
  datePublished?: string;
  dateModified?: string;
  hasPersonSchema?: boolean;
  readabilityScore?: number;
  hasLlmsTxt?: boolean;
  allowsAiBots?: boolean;
  hasRobotsTxt?: boolean;
  hasSitemap?: boolean;
}

export interface ScanMetadata {
  title: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  canonical: string;
  h1: string;
}

export interface CheckResult {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  weight: number;
}

export interface SchemaRecommendation {
  detected: string[];
  missing: string[];
  priority: string;
  reasoning: string;
}

export interface AIInsights {
  recommendations: string[];
  quickWin: string;
  contentGap: string;
  summary: string;
  schemaRecommendations?: SchemaRecommendation;
}

export interface PageSpeedData {
  score: number;
  lcp?: number | null;
  cls?: number | null;
  fid?: number | null;
}

export interface CompetitorScanMetrics {
  overall?: number;
  entity?: number;
  schema?: number;
  proof?: number;
}

export interface CompetitorScanResult {
  url: string;
  score?: number;
  checks?: CheckResult[];
  metadata?: ScanMetadata;
  pagespeed?: PageSpeedData | null;
  summary?: string;
  error?: string;
  metrics?: CompetitorScanMetrics;
  categoryScores?: {
    metadata?: number;
    headings?: number;
    schema?: number;
    contentClarity?: number;
    aiReadiness?: number;
    performance?: number;
    trustSignals?: number;
  };
}

export interface ScanResult {
  reportId?: string;
  retest_count?: number;
  max_retests?: number;
  unlocked?: boolean;
  unlockedAt?: string;
  unlockSource?: "polar_checkout" | "admin" | "manual";
  polarOrderId?: string;
  competitorUrls?: string[];
  competitors?: CompetitorScanResult[];
  url: string;
  score: number;
  checks: CheckResult[];
  aiInsights: AIInsights | null;
  pagespeed: PageSpeedData | null;
  metadata?: ScanMetadata;
  scannedAt: string;
}

