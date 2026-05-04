export interface ScrapedData {
  url: string;
  title: string;
  metaDescription: string;
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
}

export interface CheckResult {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  weight: number;
}

export interface AIInsights {
  recommendations: string[];
  quickWin: string;
  contentGap: string;
  summary: string;
}

export interface PageSpeedData {
  score: number;
  lcp?: number;
  cls?: number;
  fid?: number;
}

export interface ScanResult {
  reportId?: string;
  competitorUrls?: string[];
  url: string;
  score: number;
  checks: CheckResult[];
  aiInsights: AIInsights | null;
  pagespeed: PageSpeedData | null;
  scannedAt: string;
}
