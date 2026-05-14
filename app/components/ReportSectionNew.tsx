"use client";

import { CheckResult, CompetitorScanResult, ScanResult } from "@/types/index";
import ScoreCircle from "./ScoreCircle";
import { AlertCircle, CheckCircle2, ChevronDown, Copy, Download, ExternalLink, Lock, RotateCcw, Sparkles, TrendingUp, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import UpgradeButton from "./UpgradeButton";
import RetestButton from "./RetestButton";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { canViewFullReport, isMasterAdmin } from "@/lib/access";
import PrintLayout from "./PrintLayout";

interface Props {
  report: ScanResult;
  onReset: () => void;
}

type Priority = "critical" | "high" | "medium" | "low";
type Impact = "high" | "medium" | "low";
type Effort = "easy" | "medium" | "hard";
type Category = "schema" | "metadata" | "content" | "performance" | "trust" | "ai-readiness" | "headings";
type Plan = "guest" | "free" | "pro" | "agency";

type ReportIssue = {
  id: string;
  title: string;
  priority: Priority;
  impact: Impact;
  effort: Effort;
  category: Category;
  problem: string;
  whyItMatters: string;
  recommendedFix: string;
  example?: string;
};

type SchemaRecommendation = {
  detected: string[];
  suggested: string[];
  missing: string[];
  reasons: string[];
};

const CATEGORY_LABELS: Record<Category, string> = {
  schema: "Schema",
  metadata: "Metadata",
  content: "Content Clarity",
  performance: "Performance",
  trust: "Trust Signals",
  "ai-readiness": "AI Readiness",
  headings: "Headings",
};

const schemaWhyItMatters: Record<string, string> = {
  BreadcrumbList: "BreadcrumbList schema helps AI engines understand your site's navigation structure and page hierarchy, improving how your content is categorized and cited.",
  WebPage: "WebPage schema provides explicit page-level context including page type, description, and relationships that help AI engines classify your content accurately.",
  FAQPage: "FAQPage schema gives AI systems a clear Q&A structure for direct answer extraction from your FAQ content.",
  Article: "Article schema helps AI classify your content type and extract key information like author, publish date, and headline.",
  Organization: "Organization schema defines your brand entity so AI systems can connect your content to a trusted source.",
  WebSite: "WebSite schema helps AI engines understand your overall site identity and search context.",
  HowTo: "HowTo schema structures step-by-step guidance so AI assistants can surface your instructions accurately.",
  Product: "Product schema provides explicit details about offerings, helping AI engines extract and cite product information.",
  Service: "Service schema clarifies what you offer and who it is for, improving AI interpretation of commercial pages.",
  SoftwareApplication: "SoftwareApplication schema explains app-specific details like category and platform, improving AI understanding of software pages.",
};

function statusLabel(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Needs Work";
  return "Poor";
}

function categoryNote(category: Category, score: number) {
  if (category === "schema") return score >= 70 ? "Structured data coverage is solid." : "Schema types are missing. AI systems have less context to work with.";
  if (category === "metadata") return score >= 70 ? "Title, description, and OG tags are well-optimised." : "Tighten titles and descriptions so AI systems can accurately label this page.";
  if (category === "content") return score >= 70 ? "Content depth gives AI enough to work with." : "Add use-case detail and concise answer blocks so AI can extract clear responses.";
  if (category === "headings") return score >= 70 ? "Heading hierarchy is clear and well-structured." : "Restructure headings. A logical H1-H2-H3 hierarchy helps AI parse your content.";
  if (category === "trust") return score >= 70 ? "Trust signals and crawl directives look good." : "Add trust signals. Include HTTPS, a valid robots.txt, and author or brand information.";
  if (category === "performance") return score >= 70 ? "Page speed and Core Web Vitals are competitive." : "Speed improvements are available. Faster pages are indexed more reliably by AI crawlers.";
  return score >= 70 ? "This page is well-structured for AI answer extraction." : "Improve content clarity so AI assistants can accurately summarize and cite this page.";
}

function priorityFromWeight(weight: number): Priority {
  if (weight >= 10) return "critical";
  if (weight >= 7) return "high";
  if (weight >= 4) return "medium";
  return "low";
}

function mapCategory(id: string): Category {
  if (id.includes("schema")) return "schema";
  if (id === "title" || id === "meta_desc" || id.includes("og")) return "metadata";
  if (id.includes("heading") || id === "h1") return "headings";
  if (id === "https" || id === "robots" || id === "sitemap") return "trust";
  if (id === "word_count" || id === "internal_links" || id === "alt_text") return "content";
  return "ai-readiness";
}

function effortById(id: string): Effort {
  if (id.includes("schema")) return "medium";
  if (id === "word_count" || id === "heading_structure") return "hard";
  return "easy";
}

function impactByPriority(priority: Priority): Impact {
  if (priority === "critical" || priority === "high") return "high";
  if (priority === "medium") return "medium";
  return "low";
}

function whyItMattersById(id: string): string {
  const map: Record<string, string> = {
    title: "The page title is the primary label AI systems use when citing your page in answers. A vague or missing title means the page gets misidentified or skipped entirely.",
    meta_desc: "Meta descriptions are the first summary AI systems and search engines read. Without one, they generate their own, often pulling the wrong text.",
    h1: "The H1 is the most semantically important heading on the page. AI systems use it to determine what the page is about and whether it matches a user's query.",
    heading_structure: "A logical heading hierarchy (H1-H2-H3) acts as a table of contents for AI crawlers. Without it, content blocks are harder to parse and cite accurately.",
    schema_present: "JSON-LD schema is the clearest way to tell AI systems what your page is, who it's for, and what it contains. Pages without schema rely entirely on AI guesswork.",
    faq_schema: "FAQPage schema surfaces Q&A content directly in AI answer results. It's one of the highest-impact schema types for answer engine visibility.",
    article_schema: "Article or BlogPosting schema tells AI systems this is authoritative, dated content, increasing the likelihood it gets cited as a source.",
    og_tags: "Open Graph tags control how your page appears when shared or cited. Missing OG tags mean AI-assisted tools and social platforms display incomplete or inaccurate previews.",
    og_image: "An OG image is pulled whenever your page is cited or previewed. Without one, platforms display a blank or auto-generated placeholder that reduces click-through.",
    https: "HTTPS is a baseline trust signal. Pages served over HTTP are deprioritized by crawlers and flagged as insecure by browsers, reducing crawl frequency and citation confidence.",
    robots: "A missing or misconfigured robots.txt can inadvertently block AI crawlers from indexing your page, making it invisible to systems that rely on crawl data.",
    ai_bot_access: "If GPTBot, ClaudeBot, or PerplexityBot are blocked in your robots.txt, those AI engines cannot crawl or cite your pages, no matter how well-optimized your content is.",
    sitemap: "A sitemap tells crawlers exactly which pages exist and when they were last updated. Without one, new or updated pages are discovered more slowly.",
    llms_txt: "llms.txt is the new standard for AI crawler guidance. Without it, AI engines like ChatGPT and Perplexity must guess what your site is about. Sites with llms.txt get significantly more accurate AI citations and better representation in AI-generated answers.",
    alt_text: "Alt text is how AI vision systems and crawlers understand your images. Missing alt text leaves image content invisible to indexing and answer systems.",
    word_count: "Thin content gives AI assistants very little to extract or cite. Pages with insufficient depth are rarely chosen as sources for detailed answers.",
    internal_links: "Internal links help AI crawlers discover related pages and understand your site structure. Few internal links means important pages get crawled less frequently.",
    structured_density: "Pages with multiple relevant schema types give AI systems a richer, more confident picture of your content, increasing citation likelihood across more query types.",
    eeat_author: "AI engines use author attribution as a trust signal. Pages with clear author bylines, Person schema, or expert attribution are significantly more likely to be cited as credible sources.",
    eeat_about: "About and Contact pages signal that a real organization stands behind the content. AI engines like ChatGPT and Perplexity factor in entity clarity and organizational trust when deciding which sources to cite.",
    eeat_freshness: "AI engines prioritize fresh, recently updated content. Stale pages without dateModified schema are deprioritized in AI-generated answers, even if they rank well in traditional search.",
    readability: "AI engines like ChatGPT and Perplexity prefer content that is easy to parse and extract. Research shows readability (Flesch score) positively correlates with AI citation frequency - simpler, clearer writing gets cited more.",
    core_web_vitals: "Core Web Vitals directly affect how reliably AI crawlers can index your content. Slow LCP means AI bots may time out before reading your page. High CLS indicates unstable layouts that confuse both users and crawlers.",
  };
  return map[id] ?? "Weak signals reduce how confidently AI assistants and search systems can understand and cite this page.";
}

function recommendedFix(check: CheckResult) {
  if (check.id === "title") return "Rewrite the title to include the primary offer and audience in 30-60 characters.";
  if (check.id === "meta_desc") return "Add a clear 120-160 character meta description with problem, solution, and proof.";
  if (check.id === "h1") return "Use one H1 that states exactly what the page offers and who it is for.";
  if (check.id === "heading_structure") return "Restructure sections with H2 and H3 hierarchy to improve crawl and comprehension.";
  if (check.id === "schema_present") return "Add at least one JSON-LD block to your page head. Start with Organization and WebSite schema — these establish your brand entity for AI engines. Use schema.org or a generator like technicalseo.com/tools/schema-markup-generator/";
  if (check.id === "faq_schema") return "Wrap your Q&A content in FAQPage JSON-LD schema. Each question needs a Question and acceptedAnswer pair. Validate at validator.schema.org before publishing.";
  if (check.id === "article_schema") return "Add Article or BlogPosting JSON-LD to this page. Include headline, author, datePublished, and dateModified fields. This tells AI engines your content is authoritative and dated.";
  if (check.id === "structured_density") return "Layer additional schema types relevant to this page. If it has navigation, add BreadcrumbList. If it has a FAQ section, add FAQPage. If it represents your brand, add Organization and WebSite.";
  if (check.id.includes("schema")) return "Add JSON-LD schema relevant to this page type. Visit schema.org to find the right type for your content.";
  if (check.id === "https") return "Serve the page on HTTPS and redirect all HTTP requests.";
  if (check.id === "robots") return "Create a robots.txt at yourdomain.com/robots.txt. Make sure it does not block important pages. Validate it at search.google.com/search-console and ensure AI crawlers (GPTBot, ClaudeBot) are not blocked.";
  if (check.id === "ai_bot_access") return "Check your robots.txt and ensure GPTBot, ClaudeBot, and PerplexityBot are not blocked. Add explicit allow rules for AI crawlers.";
  if (check.id === "sitemap") return "Create a sitemap.xml listing all important pages and submit it in Google Search Console under Sitemaps. Most CMS platforms (Webflow, WordPress) generate this automatically - check your settings.";
  if (check.id === "llms_txt") return "Create a /llms.txt file at your domain root. Visit llmstxt.org for the standard format and generator tools.";
  if (check.id === "eeat_author") return "Add an author byline with a link to an author bio page. Implement Person schema with name, url, and jobTitle fields.";
  if (check.id === "eeat_about") return "Add visible links to an About page and Contact page in your navigation or footer. These are fundamental E-E-A-T trust signals.";
  if (check.id === "eeat_freshness") return "Add datePublished and dateModified fields to your page schema. Update the dateModified value whenever you meaningfully update content.";
  if (check.id === "readability") {
    const score = check.detail.match(/Flesch score: (\d+)/)?.[1];
    const scoreNum = score ? parseInt(score) : 0;
    if (scoreNum < 30) return "Content is very difficult to read. Start key sections with a 1-2 sentence direct answer. Replace technical jargon with plain language. Target sentences under 20 words. Aim for Flesch score above 60.";
    if (scoreNum < 50) return "Sentences are too long or complex for AI extraction. Break paragraphs into 2-3 sentence chunks. Use bullet points for lists. Lead each section with a direct answer statement.";
    return "Simplify sentence structure and use everyday language. Aim for a 7th-8th grade reading level (Flesch score 60-70) for optimal AI citation.";
  }
  if (check.id === "word_count") return "Expand content to at least 300 words. Add a clear problem statement, how your solution works, who it is for, and 3-5 FAQ questions with direct answers. Each FAQ answer should be 40-60 words - the ideal length for AI extraction.";
  if (check.id === "internal_links") return "Add at least 3-5 internal links to related pages. Link to your About page, key product or service pages, and any FAQ or blog content. Use descriptive anchor text that includes the topic of the linked page.";
  if (check.id === "core_web_vitals") {
    const detail = check.detail.toLowerCase();
    if (detail.includes("lcp")) return "Improve LCP by optimizing your largest image or text block - compress images, use modern formats (WebP), and preload key assets. Target LCP under 2.5 seconds.";
    if (detail.includes("cls")) return "Fix CLS by adding explicit width and height to images and embeds. Avoid inserting content above existing content. Target CLS under 0.1.";
    if (detail.includes("tbt") || detail.includes("fid")) return "Reduce TBT by deferring non-critical JavaScript, removing unused scripts, and breaking up long tasks. Target TBT under 200ms.";
    return "Run a full PageSpeed audit at pagespeed.web.dev for your URL. Focus on the top 3 opportunities listed - typically image optimization, unused JavaScript, and render-blocking resources.";
  }
  return `Review the ${check.label} signal and apply the recommended fix. Even small improvements to this signal can increase how confidently AI engines cite this page.`;
}

function issueExample(check: CheckResult) {
  if (check.id === "title") return "Example: AI Visibility Audit for SaaS Teams | Brand Name";
  if (check.id === "meta_desc") return "Example: Scan your website and get an AI visibility report with prioritized fixes.";
  return undefined;
}

function normalizeIssues(checks: CheckResult[]): ReportIssue[] {
  return checks.map((check) => {
    const priority = priorityFromWeight(check.weight);
    const category = mapCategory(check.id);
    return {
      id: check.id,
      title: check.label,
      priority,
      impact: impactByPriority(priority),
      effort: effortById(check.id),
      category,
      problem: check.detail,
      whyItMatters: whyItMattersById(check.id),
      recommendedFix: recommendedFix(check),
      example: issueExample(check),
    };
  });
}

function buildPageSpeedIssues(pagespeed: ScanResult["pagespeed"], existingIssues: ReportIssue[]): ReportIssue[] {
  if (!pagespeed || typeof pagespeed.score !== "number") return [];

  const hasPerformanceIssue = existingIssues.some((issue) =>
    issue.category === "performance"
    || issue.id === "pagespeed_low"
    || issue.id === "pagespeed_moderate"
    || issue.title.toLowerCase().includes("performance")
    || issue.title.toLowerCase().includes("page speed")
  );
  if (hasPerformanceIssue) return [];

  if (pagespeed.score < 50) {
    return [{
      id: "pagespeed_low",
      title: "Poor mobile performance",
      priority: "high",
      impact: "high",
      effort: "medium",
      category: "performance",
      problem: "The page has a low PageSpeed score, which may reduce user experience and crawl efficiency.",
      whyItMatters: "Slow pages can reduce user engagement and make it harder for crawlers and AI systems to process page content efficiently.",
      recommendedFix: "Review image sizes, render-blocking scripts, unused JavaScript, and server response time. Start with the largest assets and third-party scripts.",
    }];
  }

  if (pagespeed.score < 75) {
    return [{
      id: "pagespeed_moderate",
      title: "Performance needs improvement",
      priority: "medium",
      impact: "medium",
      effort: "medium",
      category: "performance",
      problem: "The page has moderate performance issues based on the PageSpeed score.",
      whyItMatters: "Moderate speed bottlenecks can still slow down user journeys and reduce crawl efficiency for content processing.",
      recommendedFix: "Improve loading speed by optimizing images, reducing unused scripts, and reviewing third-party resources.",
    }];
  }

  return [];
}

function badgeTone(value: Priority | Impact | Effort) {
  if (value === "critical") return "badge-critical";
  if (value === "high") return "badge-high";
  if (value === "medium") return "badge-medium";
  if (value === "low") return "badge-low";
  if (value === "hard") return "badge-high";
  if (value === "easy") return "badge-low";
  return "badge-medium";
}

function getSchemaRecommendation(report: ScanResult, issues: ReportIssue[], host: string): SchemaRecommendation {
  const checks = report.checks;
  const detectedTypes: string[] = [];
  if (checks.some((c) => c.id === "schema_present" && c.status === "pass")) detectedTypes.push("JSON-LD");
  if (checks.some((c) => c.id === "faq_schema" && c.status === "pass")) detectedTypes.push("FAQPage");
  if (checks.some((c) => c.id === "article_schema" && c.status === "pass")) detectedTypes.push("Article/HowTo");
  const detected = detectedTypes.length ? detectedTypes : ["Not detected from page content."];

  const lowerSignals = `${report.url} ${issues.map((i) => i.problem).join(" ")} ${issues.map((i) => i.title).join(" ")}`.toLowerCase();
  const suggested = ["Organization", "WebSite", "WebPage", "FAQPage"];
  if (lowerSignals.includes("blog") || lowerSignals.includes("article")) suggested.push("Article");
  if (lowerSignals.includes("how to") || lowerSignals.includes("guide")) suggested.push("HowTo");
  if (lowerSignals.includes("service")) suggested.push("Service");
  if (lowerSignals.includes("software") || lowerSignals.includes("app") || host.includes("ai")) suggested.push("SoftwareApplication");
  if (lowerSignals.includes("pricing") || lowerSignals.includes("product")) suggested.push("Product");
  if (checks.some((c) => c.id === "internal_links" && c.status !== "pass")) suggested.push("BreadcrumbList");

  const uniqueSuggested = Array.from(new Set(suggested));
  const missing = uniqueSuggested.filter((type) => !detectedTypes.some((detectedType) => detectedType.toLowerCase().includes(type.toLowerCase())));

  const reasons = [
    "Organization and WebSite define your brand entity for AI and search systems.",
    "WebPage describes the page-level context for indexing and citation confidence.",
    "FAQPage improves answer extraction for conversational search results.",
  ];
  if (!detected.includes("FAQPage")) reasons.push("FAQ schema is recommended because it was not detected in this scan.");

  return {
    detected,
    suggested: uniqueSuggested,
    missing,
    reasons,
  };
}

export default function ReportSectionNew({ report, onReset }: Props) {
  const [plan, setPlan] = useState<Plan>("guest");
  const [copyOk, setCopyOk] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  useEffect(() => {
    const onBefore = () => flushSync(() => setIsPrinting(true));
    const onAfter = () => setIsPrinting(false);
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);
    return () => {
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint", onAfter);
    };
  }, []);

  useEffect(() => {
    if (!isUpgradeModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsUpgradeModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isUpgradeModalOpen]);

  useEffect(() => {
    async function loadPlan() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return;
      const token = (await getSafeSupabaseSession(supabase))?.access_token;
      if (!token) return setPlan("guest");
      try {
        const res = await fetch("/api/account", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (!res.ok) return setPlan("free");
        const data = (await res.json()) as { profile?: { plan?: Plan } };
        setPlan(data.profile?.plan ?? "free");
      } catch {
        setPlan("free");
      }
    }
    loadPlan();
  }, []);

  const checks = report.checks;
  const isReportUnlocked = Boolean(report.unlocked || report.unlockedAt);
  const hasFullReportAccess = isMasterAdmin(plan) || canViewFullReport(plan) || isReportUnlocked;
  const hasPdfAccess = hasFullReportAccess;
  const canUnlockSpecificReport = Boolean(report.reportId);
  const isAdmin = isMasterAdmin(plan);
  const host = useMemo(() => {
    try {
      return new URL(report.url).hostname.replace(/^www\./, "");
    } catch {
      return "this website";
    }
  }, [report.url]);

  const issues = useMemo(() => {
    const baseIssues = normalizeIssues(checks).filter((issue) => checks.find((c) => c.id === issue.id)?.status !== "pass");
    const performanceIssues = buildPageSpeedIssues(report.pagespeed, baseIssues);
    return [...baseIssues, ...performanceIssues];
  }, [checks, report.pagespeed]);
  const visibleIssues = hasFullReportAccess ? issues : issues.slice(0, 3);
  const hiddenCount = Math.max(0, issues.length - visibleIssues.length);
  const critical = issues.filter((i) => i.priority === "critical");
  const high = issues.filter((i) => i.priority === "high");
  const nice = issues.filter((i) => i.priority === "medium" || i.priority === "low");
  const scoreStatus = statusLabel(report.score);
  const diagnosis = issues[0]?.problem ?? "Core visibility signals are in good shape.";
  const topOpportunity = issues[0]?.recommendedFix ?? "Keep schema and answer blocks current as pages evolve.";
  const topInsights = [
    {
      title: "Biggest issue",
      text: issues[0]?.title ? `${issues[0].title}: ${issues[0].problem}` : "No critical blockers were detected.",
      icon: AlertCircle,
    },
    {
      title: "Fastest win",
      text: issues.find((issue) => issue.effort === "easy")?.recommendedFix ?? "Apply metadata and FAQ schema updates first for quick wins.",
      icon: Zap,
    },
    {
      title: "Performance score",
      text: report.pagespeed?.score !== undefined
        ? `${report.pagespeed.score}/100. Page speed and Core Web Vitals affect how reliably AI crawlers can index your content.`
        : "PageSpeed score unavailable. The performance API did not return data for this page.",
      icon: TrendingUp,
    },
  ];

  const categoryScores = useMemo(() => {
    const groups: Record<Category, number[]> = {
      metadata: [],
      headings: [],
      schema: [],
      content: [],
      "ai-readiness": [],
      performance: [],
      trust: [],
    };

    checks.forEach((check) => {
      const category = mapCategory(check.id);
      const value = check.status === "pass" ? 100 : check.status === "warn" ? 60 : 25;
      groups[category].push(value);
    });

    if (report.pagespeed?.score !== undefined) groups.performance.push(report.pagespeed.score);

    return (Object.entries(groups) as Array<[Category, number[]]>).map(([category, values]) => ({
      category,
      score: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0,
      status: statusLabel(values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0),
    }));
  }, [checks, report.pagespeed?.score]);

  const schemaRecommendation = useMemo(() => getSchemaRecommendation(report, issues, host), [report, issues, host]);
  const competitorRows = useMemo(() => {
    const candidates = Array.isArray(report.competitors) ? report.competitors : [];
    return candidates.filter((item): item is CompetitorScanResult => !!item && typeof item.url === "string");
  }, [report.competitors]);
  const hasCompetitorUrlsOnly = Boolean(report.competitorUrls?.length) && competitorRows.length === 0;
  const categoryComparison = useMemo(() => {
    const ours = categoryScores.reduce((acc, item) => {
      acc[item.category] = item.score;
      return acc;
    }, {} as Record<Category, number>);
    return competitorRows.map((competitor) => {
      const mapped: Partial<Record<Category, number>> = {};
      if (competitor.categoryScores) {
        if (typeof competitor.categoryScores.metadata === "number") mapped.metadata = competitor.categoryScores.metadata;
        if (typeof competitor.categoryScores.headings === "number") mapped.headings = competitor.categoryScores.headings;
        if (typeof competitor.categoryScores.schema === "number") mapped.schema = competitor.categoryScores.schema;
        if (typeof competitor.categoryScores.contentClarity === "number") mapped.content = competitor.categoryScores.contentClarity;
        if (typeof competitor.categoryScores.aiReadiness === "number") mapped["ai-readiness"] = competitor.categoryScores.aiReadiness;
        if (typeof competitor.categoryScores.performance === "number") mapped.performance = competitor.categoryScores.performance;
        if (typeof competitor.categoryScores.trustSignals === "number") mapped.trust = competitor.categoryScores.trustSignals;
      }
      return { competitor, ours, mapped };
    });
  }, [categoryScores, competitorRows]);
  const behindSignals = useMemo(() => {
    if (!categoryComparison.length) return [] as Array<{ category: Category; gap: number }>;
    const categories: Category[] = ["metadata", "schema", "content", "ai-readiness", "performance", "trust"];
    return categories
      .map((category) => {
        const ours = categoryComparison[0]?.ours[category] ?? 0;
        const bestCompetitor = Math.max(...categoryComparison.map((row) => row.mapped[category] ?? 0));
        return { category, gap: bestCompetitor - ours };
      })
      .filter((item) => item.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 3);
  }, [categoryComparison]);
  const comparisonState = useMemo(() => {
    const scoredCompetitors = competitorRows.filter((item) => typeof item.score === "number");
    if (!scoredCompetitors.length) return { gap: 0, mode: "tied" as const };
    const bestCompetitorScore = Math.max(...scoredCompetitors.map((item) => item.score as number));
    const gap = report.score - bestCompetitorScore;
    if (gap < 0) return { gap, mode: "behind" as const };
    if (gap > 0) return { gap, mode: "ahead" as const };
    return { gap, mode: "tied" as const };
  }, [competitorRows, report.score]);
  const competitiveTakeaway = comparisonState.mode === "ahead"
    ? `You are currently ahead by ${comparisonState.gap} points. Keep improving the highest-priority fixes below to protect your lead.`
    : comparisonState.mode === "behind"
      ? `Your competitor is currently ahead by ${Math.abs(comparisonState.gap)} points. Start with the critical fixes below to close the gap.`
      : "Both pages currently have the same visibility score. Start with the highest-priority fixes below to pull ahead.";
  const detectedSchemaTypes = report.aiInsights?.schemaRecommendations?.detected ?? [];
  const missingSchemaTypes = report.aiInsights?.schemaRecommendations?.missing ?? [];
  const prioritySchema = report.aiInsights?.schemaRecommendations?.priority ?? null;
  const priorityReasoning = report.aiInsights?.schemaRecommendations?.reasoning ?? "";
  const otherSuggestedTypes = missingSchemaTypes.filter((t) => t !== prioritySchema);
  const priorityWhyItMatters = prioritySchema
    ? (schemaWhyItMatters[prioritySchema] ?? `${prioritySchema} schema helps AI systems understand and classify this page with higher confidence.`)
    : "";
  const otherSchemaExplanations = otherSuggestedTypes.map((type) => ({
    type,
    why: schemaWhyItMatters[type] ?? `${type} schema adds clearer structure so AI engines can interpret this page more accurately.`,
  }));
  const aiSummary = report.aiInsights?.summary?.trim()
    || `This page appears to be about ${report.metadata?.title?.trim() || host}. The available metadata gives partial context, but the page may need clearer positioning for AI systems to summarize it confidently.`;
  const confidenceLabel = report.score >= 80 ? "High" : report.score >= 60 ? "Medium" : "Low";
  const confidenceBadge = `${confidenceLabel} confidence`;
  const confidenceDetail = report.score >= 80
    ? "The page gives AI systems enough clear signals to understand the core topic."
    : report.score >= 60
      ? "The page has useful signals, but some context or structure is missing."
      : "The page needs clearer metadata, schema, and answer-ready content.";
  const inferredMissingContext = useMemo(() => {
    const findings: string[] = [];
    const hasIssue = (ids: string[]) => checks.some((check) => ids.includes(check.id) && check.status !== "pass");
    if (hasIssue(["schema_present", "faq_schema", "article_schema", "structured_density"])) findings.push("Structured data");
    if (hasIssue(["title", "meta_desc", "og_tags", "og_image"])) findings.push("Clear page positioning");
    if (hasIssue(["h1", "heading_structure"])) findings.push("Heading structure");
    if (hasIssue(["word_count", "internal_links", "alt_text"])) findings.push("Use cases and audience clarity");
    if (hasIssue(["https", "robots", "sitemap"])) findings.push("Proof and trust signals");
    if (!findings.length) return "No major missing context detected.";
    if (findings.length === 1) return `The page does not clearly surface ${findings[0].toLowerCase()}.`;
    if (findings.length === 2) return `The page does not clearly surface ${findings[0].toLowerCase()} and ${findings[1].toLowerCase()}.`;
    const head = findings.slice(0, -1).map((item) => item.toLowerCase()).join(", ");
    const tail = findings[findings.length - 1].toLowerCase();
    return `The page does not clearly surface ${head}, and ${tail}.`;
  }, [checks]);
  const missingContextText = report.aiInsights?.contentGap?.trim() || inferredMissingContext;
  const nextBestImprovement = report.aiInsights?.quickWin?.trim() || issues[0]?.recommendedFix || "Keep improving the highest-priority issue from this audit.";
  const copyReport = async () => {
    const lines = [
      `AEOCheck - AI Visibility Readiness Report`,
      `URL: ${report.url}`,
      `Score: ${report.score} (${scoreStatus})`,
      `Scanned: ${new Date(report.scannedAt).toLocaleString()}`,
      "",
      `Main diagnosis: ${diagnosis}`,
      `Top opportunity: ${topOpportunity}`,
      "",
      "Priority action plan:",
      ...issues.slice(0, 8).map((issue, i) => `${i + 1}. [${issue.priority}] ${issue.title} - ${issue.recommendedFix}`),
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopyOk(true);
    setTimeout(() => setCopyOk(false), 1500);
  };

const downloadPdf = () => {
    if (!hasPdfAccess) return;
    window.print();
  };

  return (
    <>
    <div className="report-shell report-stack pb-8 premium-report">
      <section className="surface report-hero print-section print-cover">
        <div className="report-hero-grid">
          <ScoreCircle score={report.score} />
          <div className="report-hero-copy">
            <div className="report-hero-badges">
              <span className="badge">{hasFullReportAccess ? "Full Report" : "Free Preview"}</span>
              {isAdmin && <span className="badge">Master Admin - Unlimited Access</span>}
              <span className="badge">{scoreStatus}</span>
              <span className="badge">AI Visibility Readiness Report</span>
            </div>
            <h2 className="report-title">{report.url}</h2>
            <a href={report.url} target="_blank" rel="noreferrer" className="report-open-link">
              Open page <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <p className="report-meta-line">
              Scanned {new Date(report.scannedAt).toLocaleDateString()} - Score {report.score}/100 - Status {scoreStatus}
            </p>
            <div className="report-save-panel">
              <div><span>Main diagnosis</span><strong>{diagnosis}</strong></div>
              <div><span>Top opportunity</span><strong>{topOpportunity}</strong></div>
            </div>
            <div className="insights-list">
              {topInsights.map((insight) => {
                const Icon = insight.icon;
                return (
                  <article key={insight.title} className="insight-card">
                    <div className="insight-card-head">
                      <span><Icon className="h-4 w-4" /> {insight.title}</span>
                    </div>
                    <p>{insight.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="surface report-card print-section">
        <h3 className="section-heading">Score Breakdown</h3>
        <p className="section-kicker mt-1">How each area of your page compares against the standard.</p>
        <div className="score-breakdown-grid mt-4">
          {categoryScores.map((item) => (
            <div key={item.category} className="score-breakdown-card">
              <div className="score-breakdown-head">
                <span>{CATEGORY_LABELS[item.category]}</span>
                <strong>{item.score}</strong>
              </div>
              <div className="score-bar"><span className="score-bar-fill" style={{ width: `${item.score}%` }} /></div>
              <small>{item.status}</small>
              <p>{categoryNote(item.category, item.score)}</p>
            </div>
          ))}
        </div>
      </section>

      {hasFullReportAccess && (competitorRows.length > 0 || hasCompetitorUrlsOnly) && (
        <section className="surface report-card print-section">
          <h3 className="section-heading">Competitor Analysis</h3>
          <p className="section-kicker mt-1">Compare your page against the competitor URL included in this scan.</p>

          {competitorRows.length === 0 ? (
            <div className="competitor-empty-state mt-4">
              <p>Competitor comparison is ready in the scanner, but this report does not include competitor scan data yet.</p>
              <a href="/#scanner" className="btn btn-secondary">Run a comparison scan</a>
            </div>
          ) : (
            <div className="competitor-analysis-grid mt-4">
              <div className="competitor-summary-card">
                <strong>Your site</strong>
                <p>{report.url}</p>
                <span>{report.score}/100</span>
              </div>
              {competitorRows.map((item) => {
                if (item.error || typeof item.score !== "number") {
                  return (
                    <div key={item.url} className="competitor-summary-card">
                      <strong>Competitor</strong>
                      <p>{item.url}</p>
                      <small>Could not scan competitor URL</small>
                    </div>
                  );
                }
                const gap = report.score - item.score;
                return (
                  <div key={item.url} className="competitor-summary-card">
                    <strong>Competitor</strong>
                    <p>{item.url}</p>
                    <span>{item.score}/100</span>
                    <small>
                      {gap > 0
                        ? `You are ahead by ${gap} points`
                        : gap < 0
                          ? `Competitor is ahead by ${Math.abs(gap)} points`
                          : "Scores are tied"}
                    </small>
                  </div>
                );
              })}

              <div className="competitor-notes-card">
                <strong>Competitive takeaway</strong>
                <p>{competitiveTakeaway}</p>
              </div>
              {behindSignals.length > 0 && (
                <div className="competitor-notes-card">
                  <strong>Category gaps</strong>
                  <ul className="competitor-list">
                    {behindSignals.map((item) => (
                      <li key={item.category}>{CATEGORY_LABELS[item.category]}: {item.gap} points behind top competitor</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <section className="surface report-card print-section">
        <h3 className="section-heading">AI Answer Snapshot</h3>
        <p className="section-kicker mt-1">How an AI assistant may understand this page from the visible content.</p>
        <div className="ai-snapshot-grid mt-4">
          <article className="ai-snapshot-card">
            <p className="ai-snapshot-label">If AI summarized this page</p>
            <p className="ai-snapshot-value ai-snapshot-summary">{aiSummary}</p>
          </article>
          <article className="ai-snapshot-card">
            <p className="ai-snapshot-label">Confidence</p>
            <span className={`ai-confidence-badge ai-confidence-${confidenceLabel.toLowerCase()}`}>{confidenceBadge}</span>
            <p className="muted-copy">{confidenceDetail}</p>
          </article>
          {hasFullReportAccess ? (
            <>
              <article className="ai-snapshot-card">
                <p className="ai-snapshot-label">Missing context</p>
                <p className="ai-snapshot-value">{missingContextText}</p>
              </article>
              <article className="ai-snapshot-card">
                <p className="ai-snapshot-label">Next best improvement</p>
                <p className="ai-snapshot-value">{nextBestImprovement}</p>
              </article>
            </>
          ) : (
            <article className="ai-snapshot-card ai-snapshot-locked">
              <p className="ai-snapshot-label">Missing context and next best improvement</p>
              <p className="ai-snapshot-value">Unlock detailed guidance to see missing context and the next best improvement for this page.</p>
              <button type="button" className="btn btn-primary" onClick={() => setIsUpgradeModalOpen(true)}>Unlock Full Report</button>
            </article>
          )}
        </div>
      </section>

      {report.metadata && (
        <section className="surface report-card print-section">
          <h3 className="section-heading">Metadata Overview</h3>
          <p className="section-kicker mt-1">What AI and search engines see when they index this page.</p>
          <div className="metadata-grid mt-4">
            <MetaRow label="Title" value={report.metadata.title} charLimit={60} />
            <MetaRow label="Meta Description" value={report.metadata.metaDescription} charLimit={160} />
            <MetaRow label="H1" value={report.metadata.h1} />
            <MetaRow label="Canonical URL" value={report.metadata.canonical} isUrl />
            <MetaRow label="OG Title" value={report.metadata.ogTitle} charLimit={60} />
            <MetaRow label="OG Description" value={report.metadata.ogDescription} charLimit={155} />
            <MetaRow label="OG Image" value={report.metadata.ogImage} isUrl />
          </div>
        </section>
      )}

      <section className="surface report-card print-section pt-8">
        <h3 className="section-heading">Priority Action Plan</h3>
        <p className="section-kicker mt-1">Your highest-impact fixes, grouped by urgency.</p>
        <div className="action-plan-grid mt-4">
          <PriorityColumn title="Critical" description="Fix immediately to avoid visibility loss." items={critical} tone="critical" />
          <PriorityColumn title="High Impact" description="Strong lift with manageable effort." items={high} tone="high" />
          <PriorityColumn title="Nice to Have" description="Quality boosters after core fixes." items={nice} tone="medium" />
        </div>
      </section>

      <section className="surface report-card print-section">
        <h3 className="section-heading">Detailed Issues</h3>
        <p className="section-kicker mt-1">Each issue with the problem, why it matters, and exactly how to fix it.</p>
        <div className="detailed-issues-list mt-4">
          {visibleIssues.map((issue) => {
            const isOpen = expanded === issue.id;
            return (
              <article key={issue.id} className={`issue-accordion-card${isOpen ? " is-open" : ""}`}>
                <button
                  className="issue-accordion-toggle"
                  onClick={() => setExpanded(isOpen ? null : issue.id)}
                  type="button"
                  aria-expanded={isOpen}
                >
                  <div className="issue-toggle-left">
                    <span className={`issue-category-pill issue-cat-${issue.category}`}>
                      {CATEGORY_LABELS[issue.category]}
                    </span>
                    <strong className="issue-toggle-title">{issue.title}</strong>
                  </div>
                  <div className="issue-toggle-right">
                    <div className="issue-pill-row">
                      <span className={`mini-pill ${badgeTone(issue.priority)}`}>{issue.priority}</span>
                      <span className={`mini-pill ${badgeTone(issue.impact)}`}>â†‘ {issue.impact}</span>
                      <span className={`mini-pill ${badgeTone(issue.effort)}`}>{issue.effort}</span>
                    </div>
                    <ChevronDown className={`issue-chevron${isOpen ? " is-open" : ""}`} />
                  </div>
                </button>
                {isOpen && (
                  <div className="issue-expanded">
                    <div className="issue-section">
                      <p className="issue-section-label"><AlertCircle className="h-3.5 w-3.5" /> Problem</p>
                      <p className="issue-section-text">{issue.problem}</p>
                    </div>
                    <div className="issue-section">
                      <p className="issue-section-label">Why it matters</p>
                      <p className="issue-section-text">{issue.whyItMatters}</p>
                    </div>
                    <div className="issue-section">
                      <p className="issue-section-label">Recommended fix</p>
                      <p className="issue-section-text">{issue.recommendedFix}</p>
                    </div>
                    {hasFullReportAccess && issue.example && (
                      <pre className="report-code-block">{issue.example}</pre>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
        {!hasFullReportAccess && hiddenCount > 0 && (
          <div className="locked-panel detailed-issues-lock">
            <div className="detailed-issues-lock-copy">
              <p>Unlock the full issue breakdown</p>
              <small>Get every issue with why it matters, priority, effort level, and the recommended fix.</small>
              <small>Full Report is a one-time unlock for this scan.</small>
            </div>
            <button type="button" className="btn btn-primary detailed-issues-lock-cta" onClick={() => setIsUpgradeModalOpen(true)}>Unlock Full Report</button>
          </div>
        )}
      </section>

      {report.aiInsights?.schemaRecommendations && (
        <section className="surface report-card print-section">
          <h3 className="section-heading">Schema Analysis</h3>
          <p className="section-kicker mt-1">Detected and recommended schema types based on actual page content.</p>
          <div className="schema-analysis-grid mt-4">
            <div className="schema-box schema-detected-box">
              <h4 className="schema-box-title">Currently Detected ({detectedSchemaTypes.length})</h4>
              {detectedSchemaTypes.length > 0 ? (
                <div className="schema-tags">
                  {detectedSchemaTypes.map((type) => (
                    <span key={type} className="schema-tag schema-tag-detected">{type}</span>
                  ))}
                </div>
              ) : (
                <p className="schema-empty-state">No schema detected from page content.</p>
              )}
            </div>

            <div className="schema-box schema-priority-box">
              <h4 className="schema-box-title">Priority Schema to Add</h4>
              {prioritySchema ? (
                <>
                  <div className="schema-priority-badge-large">{prioritySchema}</div>
                  {priorityReasoning && (
                    <div className="schema-reasoning-inline">
                      <strong className="schema-reasoning-title">Why this matters</strong>
                      <p>{priorityReasoning || priorityWhyItMatters}</p>
                    </div>
                  )}
                  {!priorityReasoning && priorityWhyItMatters && (
                    <div className="schema-reasoning-inline">
                      <strong className="schema-reasoning-title">Why this matters</strong>
                      <p>{priorityWhyItMatters}</p>
                    </div>
                  )}
                  <div className="schema-implementation">
                    <strong className="schema-impl-title">How to implement</strong>
                    <ol className="schema-impl-steps">
                      <li>Visit <a href={`https://schema.org/${prioritySchema}`} target="_blank" rel="noopener noreferrer">schema.org/{prioritySchema}</a> for documentation</li>
                      <li>Use a <a href="https://technicalseo.com/tools/schema-markup-generator/" target="_blank" rel="noopener noreferrer">schema generator tool</a> with your actual page content</li>
                      <li>Add the JSON-LD <code>&lt;script&gt;</code> to your page&apos;s <code>&lt;head&gt;</code></li>
                      <li>Validate with <a href="https://validator.schema.org/" target="_blank" rel="noopener noreferrer">Google&apos;s Schema Validator</a> before deploying</li>
                    </ol>
                    <div className="schema-warning">
                      &#9888; Always base schema on your actual page content. Never publish generic templates without customising every field.
                    </div>
                  </div>
                </>
              ) : (
                <p className="schema-empty-state">Your page has good schema coverage. No additional types needed at this time.</p>
              )}
            </div>
          </div>

          {otherSuggestedTypes.length > 0 && (
            <div className="schema-other-types mt-4">
              <strong className="schema-other-title">Other schema types to consider</strong>
              <div className="schema-tags mt-2">
                {otherSuggestedTypes.map((type) => (
                  <span key={type} className="schema-tag schema-tag-missing">{type}</span>
                ))}
              </div>
              <div className="schema-other-reasons">
                {otherSchemaExplanations.map((entry) => (
                  <p key={entry.type}>
                    <strong>{entry.type}:</strong> {entry.why}
                  </p>
                ))}
              </div>
              {otherSuggestedTypes.includes("FAQPage") && (
                <p className="schema-note">Google deprecated FAQ rich results in May 2026, but FAQPage schema remains useful for AI answer engines like ChatGPT and Perplexity.</p>
              )}
            </div>
          )}
        </section>
      )}

      <section className="surface report-card print-section report-notes-card">
        <div className="report-notes-inline">
          <span className="report-notes-icon" aria-hidden="true">
            <AlertCircle className="h-4 w-4" />
          </span>
          <div className="report-notes-copy">
            <h3 className="section-heading">Report notes</h3>
            <p>This audit is generated from publicly available page content and automated analysis. Review recommendations before publishing changes, especially schema, metadata, and content updates.</p>
          </div>
        </div>
      </section>

      <section className="surface report-card print-section">
        <h3 className="section-heading">PDF Export</h3>
        <div className="pdf-card-grid mt-4">
          <div className="pdf-includes-block">
            <p className="section-kicker">What&apos;s included in your PDF:</p>
            <div className="pdf-includes-grid">
              <div className="pdf-include-item">
                <span className="pdf-include-icon">📋</span>
                <div>
                  <strong>Executive Summary</strong>
                  <p>Main diagnosis, top opportunity, and performance score at a glance.</p>
                </div>
              </div>
              <div className="pdf-include-item">
                <span className="pdf-include-icon">📊</span>
                <div>
                  <strong>Score Breakdown</strong>
                  <p>Category-by-category scores across all 7 readiness areas.</p>
                </div>
              </div>
              <div className="pdf-include-item">
                <span className="pdf-include-icon">🤖</span>
                <div>
                  <strong>AI Answer Snapshot</strong>
                  <p>How AI assistants currently understand and summarize this page.</p>
                </div>
              </div>
              <div className="pdf-include-item">
                <span className="pdf-include-icon">⚡</span>
                <div>
                  <strong>Priority Action Plan</strong>
                  <p>Critical, high impact, and passing checks grouped by urgency.</p>
                </div>
              </div>
              <div className="pdf-include-item">
                <span className="pdf-include-icon">🔍</span>
                <div>
                  <strong>Detailed Issue Breakdown</strong>
                  <p>Every issue with why it matters and the exact recommended fix.</p>
                </div>
              </div>
              <div className="pdf-include-item">
                <span className="pdf-include-icon">🏷️</span>
                <div>
                  <strong>Schema Recommendations</strong>
                  <p>Detected types, missing schema, and implementation guidance.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="pdf-action-card">
            <div className="pdf-preview-mini" aria-hidden="true">
              <span>AEOCheck</span>
              <strong>AI Visibility Report</strong>
              <small>{host}</small>
              <em>{report.score}/100 - {scoreStatus}</em>
            </div>
            <strong>Client-shareable audit PDF</strong>
            <p style={{ textDecoration: "none" }}>A clean, professional report you can share with clients or your team. No formatting work needed.</p>
            {hasPdfAccess ? (
              <button className="btn btn-primary" onClick={downloadPdf}><Download className="h-4 w-4" /> Download PDF</button>
            ) : (
              <>
                <div className="locked-inline"><Lock className="h-4 w-4" /> Export a client-ready PDF</div>
                <p>Download a clean report with scores, priority fixes, detailed issues, schema recommendations, and AI insights.</p>
                <button type="button" className="btn btn-primary" onClick={() => setIsUpgradeModalOpen(true)}>Unlock Full Report</button>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="report-action-row flex flex-col justify-center gap-3 sm:flex-row print-hidden">
        <button onClick={copyReport} className="btn btn-secondary">
          <Copy className="h-4 w-4" /> {copyOk ? "Copied" : "Copy report summary"}
        </button>
        {report.reportId && (
          <RetestButton
            reportId={report.reportId}
            url={report.url}
            retestCount={report.retest_count ?? 0}
            maxRetests={report.max_retests ?? 3}
            isUnlocked={hasFullReportAccess}
            isProMonthly={canViewFullReport(plan)}
            isMasterAdmin={isAdmin}
          />
        )}
        {!hasFullReportAccess && <button type="button" className="btn btn-primary" onClick={() => setIsUpgradeModalOpen(true)}>Unlock Full Report</button>}
        <button onClick={onReset} className="btn btn-primary">
          <RotateCcw className="h-4 w-4" /> Scan another URL
        </button>
      </div>
    </div>
    {!hasFullReportAccess && isUpgradeModalOpen && createPortal(
      <div className="upgrade-choice-overlay" onClick={() => setIsUpgradeModalOpen(false)}>
        <div className="upgrade-choice-modal" onClick={(event) => event.stopPropagation()}>
          <div className="upgrade-choice-head">
            <h3>Choose how to unlock this report</h3>
            <p>Unlock this audit once, or upgrade for ongoing reports.</p>
          </div>
          <div className="upgrade-choice-grid">
            <article className="upgrade-choice-card">
              <span className="upgrade-choice-badge">One-time</span>
              <strong className="upgrade-choice-title">Full Report</strong>
              <span className="upgrade-choice-price">$14 one-time</span>
              <p className="upgrade-choice-description">Unlock this report only.</p>
              <ul className="upgrade-choice-features">
                <li><CheckCircle2 className="upgrade-choice-feature-icon h-4 w-4" /><span className="upgrade-choice-feature-text">Full issue breakdown</span></li>
                <li><CheckCircle2 className="upgrade-choice-feature-icon h-4 w-4" /><span className="upgrade-choice-feature-text">Fix recommendations</span></li>
                <li><CheckCircle2 className="upgrade-choice-feature-icon h-4 w-4" /><span className="upgrade-choice-feature-text">Schema recommendations</span></li>
                <li><CheckCircle2 className="upgrade-choice-feature-icon h-4 w-4" /><span className="upgrade-choice-feature-text">AI Answer Snapshot</span></li>
                <li><CheckCircle2 className="upgrade-choice-feature-icon h-4 w-4" /><span className="upgrade-choice-feature-text">Client-ready PDF report</span></li>
              </ul>
              <UpgradeButton
                checkoutType="full_report"
                reportId={report.reportId}
                reportUrl={report.url}
                className="btn btn-secondary upgrade-choice-button"
                disabled={!canUnlockSpecificReport}
              >
                Unlock this report
              </UpgradeButton>
              {!canUnlockSpecificReport && (
                <small>Run a scan first to unlock a specific report.</small>
              )}
            </article>

            <article className="upgrade-choice-card is-recommended">
              <span className="upgrade-choice-badge upgrade-choice-badge-recommended">Recommended</span>
              <strong className="upgrade-choice-title">Pro Monthly</strong>
              <span className="upgrade-choice-price">$39/month</span>
              <p className="upgrade-choice-description">Best if you scan websites regularly.</p>
              <ul className="upgrade-choice-features">
                <li><CheckCircle2 className="upgrade-choice-feature-icon h-4 w-4" /><span className="upgrade-choice-feature-text">30 full reports per month</span></li>
                <li><CheckCircle2 className="upgrade-choice-feature-icon h-4 w-4" /><span className="upgrade-choice-feature-text">Saved report history</span></li>
                <li><CheckCircle2 className="upgrade-choice-feature-icon h-4 w-4" /><span className="upgrade-choice-feature-text">Client-ready PDF reports</span></li>
                <li><CheckCircle2 className="upgrade-choice-feature-icon h-4 w-4" /><span className="upgrade-choice-feature-text">Competitor comparisons</span></li>
                <li><CheckCircle2 className="upgrade-choice-feature-icon h-4 w-4" /><span className="upgrade-choice-feature-text">Priority scan access</span></li>
              </ul>
              <UpgradeButton checkoutType="pro_plan" className="btn btn-primary upgrade-choice-button">
                Start monthly plan
              </UpgradeButton>
            </article>
          </div>
          <p className="upgrade-choice-note">You can cancel the monthly plan anytime from Polar billing.</p>
          <div className="upgrade-choice-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setIsUpgradeModalOpen(false)}>Cancel</button>
          </div>
        </div>
      </div>,
      document.body
    )}
    {isPrinting && <PrintLayout report={report} />}
    </>
  );
}

function MetaRow({ label, value, charLimit, isUrl }: { label: string; value: string; charLimit?: number; isUrl?: boolean }) {
  const missing = !value;
  const over = charLimit && value.length > charLimit;
  return (
    <div className="metadata-row">
      <span className="metadata-label">{label}</span>
      <span className={`metadata-value${missing ? " metadata-missing" : ""}${over ? " metadata-over" : ""}`}>
        {missing ? "Not set" : value}
      </span>
      {!missing && charLimit && (
        <span className={`metadata-char-count${over ? " metadata-char-over" : ""}`}>
          {value.length}/{charLimit}
        </span>
      )}
      {!missing && isUrl && <span className="metadata-char-count">URL</span>}
    </div>
  );
}

function PriorityColumn({ title, description, items, tone }: { title: string; description: string; items: ReportIssue[]; tone: "critical" | "high" | "medium" }) {
  return (
    <article className="action-plan-column">
      <div className="action-plan-head">
        <span>{title}</span>
        <strong>{items.length}</strong>
      </div>
      <p className="action-plan-desc">{description}</p>
      <div className="action-plan-items">
        {items.length ? items.slice(0, 6).map((item) => (
          <div key={`${title}-${item.id}`} className="action-plan-item">
            <span className="action-plan-icon flex-shrink-0"><Sparkles className="h-3.5 w-3.5" /></span>
            <div className="action-plan-item-text flex-1 min-w-0">
              <p>{item.title}</p>
              <small>{item.problem}</small>
            </div>
            <span className={`mini-pill ${badgeTone(tone)} flex-shrink-0`}>{item.priority}</span>
          </div>
        )) : <p className="muted-copy">No issues in this group.</p>}
      </div>
    </article>
  );
}


