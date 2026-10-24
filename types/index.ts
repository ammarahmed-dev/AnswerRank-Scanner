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
  /** "reader" when direct HTML access was blocked and only text from the reader fallback is available. */
  source?: "html" | "reader";
}

/** Immutable description of how a newly stored score was produced. Legacy reports omit it. */
export interface ScoringMethodology {
  version: string;
  overall: { aggregation: "weighted"; statusCredit: Record<CheckResult["status"], number> };
  categories: {
    aggregation: "unweighted_mean";
    statusPoints: Record<CheckResult["status"], number>;
    missingSchemaCap: number;
    performance: "measured_only";
  };
  unverifiedHandling: "warning_credit";
  evidence: {
    pageSource: "html" | "reader";
    requestedUrl: string;
    resolvedUrl?: string;
    finalUrlVerified: boolean;
    pageSpeed: "measured" | "unavailable" | "not_requested";
  };
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
  tbt?: number | null;
  /** Legacy reports stored Lighthouse TBT under this key. */
  fid?: number | null;
}

export interface CompetitorScanMetrics {
  overall?: number;
  entity?: number;
  schema?: number;
  proof?: number;
}

export interface CompetitorScanResult {
  methodology?: ScoringMethodology;
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

/** Compact summary of the same user's previous scan of this URL, stored in the newer report. */
export interface PreviousScanSummary {
  methodologyVersion?: string;
  reportId?: string;
  score: number;
  scannedAt: string;
  checks: Array<{ id: string; label: string; status: "pass" | "warn" | "fail" }>;
}

export interface ScanResult {
  methodology?: ScoringMethodology;
  reportId?: string;
  /** Present on retests: what the previous scan of this URL looked like. */
  previous?: PreviousScanSummary;
  retest_count?: number;
  max_retests?: number;
  unlocked?: boolean;
  unlockedAt?: string;
  unlockSource?: "polar_checkout" | "admin" | "manual";
  polarOrderId?: string;
  isFullReport?: boolean;
  /** True when the site blocked direct HTML access and HTML-only signals could not be verified. */
  limitedScan?: boolean;
  /** True when paid sections were removed server-side because the viewer lacks full access. */
  redacted?: boolean;
  onetimeLockMessage?: string;
  competitorUrls?: string[];
  competitors?: CompetitorScanResult[];
  url: string;
  score: number;
  checks: CheckResult[];
  categoryScores?: {
    metadata?: number;
    headings?: number;
    schema?: number;
    contentClarity?: number;
    aiReadiness?: number;
    performance?: number;
    trustSignals?: number;
  };
  aiInsights: AIInsights | null;
  pagespeed: PageSpeedData | null;
  schemaTypes?: string[];
  metadata?: ScanMetadata;
  scannedAt: string;
}
