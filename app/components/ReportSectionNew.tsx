"use client";

import { CheckResult, ScanResult } from "@/types/index";
import ScoreCircle from "./ScoreCircle";
import { AlertCircle, CheckCircle2, ChevronDown, Copy, Download, ExternalLink, Lock, RotateCcw, Sparkles, TrendingUp, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import UpgradeButton from "./UpgradeButton";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { canDownloadPdf, canViewFullReport, isMasterAdmin } from "@/lib/access";
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

function statusLabel(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Needs Work";
  return "Poor";
}

function categoryNote(category: Category, score: number) {
  if (category === "schema") return score >= 70 ? "Structured data coverage is solid." : "Schema types are missing — AI systems have less context to work with.";
  if (category === "metadata") return score >= 70 ? "Title, description, and OG tags are well-optimised." : "Tighten titles and descriptions so AI systems can accurately label this page.";
  if (category === "content") return score >= 70 ? "Content depth gives AI enough to work with." : "Add use-case detail and concise answer blocks so AI can extract clear responses.";
  if (category === "headings") return score >= 70 ? "Heading hierarchy is clear and well-structured." : "Restructure headings — a logical H1→H2→H3 hierarchy helps AI parse your content.";
  if (category === "trust") return score >= 70 ? "Trust signals and crawl directives look good." : "Add trust signals — HTTPS, a valid robots.txt, and author or brand information.";
  if (category === "performance") return score >= 70 ? "Page speed and Core Web Vitals are competitive." : "Speed improvements available — faster pages are indexed more reliably by AI crawlers.";
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
    meta_desc: "Meta descriptions are the first summary AI systems and search engines read. Without one, they generate their own — often pulling the wrong text.",
    h1: "The H1 is the most semantically important heading on the page. AI systems use it to determine what the page is about and whether it matches a user's query.",
    heading_structure: "A logical heading hierarchy (H1 → H2 → H3) acts as a table of contents for AI crawlers. Without it, content blocks are harder to parse and cite accurately.",
    schema_present: "JSON-LD schema is the clearest way to tell AI systems what your page is, who it's for, and what it contains. Pages without schema rely entirely on AI guesswork.",
    faq_schema: "FAQPage schema surfaces Q&A content directly in AI answer results. It's one of the highest-impact schema types for answer engine visibility.",
    article_schema: "Article or BlogPosting schema tells AI systems this is authoritative, dated content — increasing the likelihood it gets cited as a source.",
    og_tags: "Open Graph tags control how your page appears when shared or cited. Missing OG tags mean AI-assisted tools and social platforms display incomplete or inaccurate previews.",
    og_image: "An OG image is pulled whenever your page is cited or previewed. Without one, platforms display a blank or auto-generated placeholder that reduces click-through.",
    https: "HTTPS is a baseline trust signal. Pages served over HTTP are deprioritized by crawlers and flagged as insecure by browsers — reducing crawl frequency and citation confidence.",
    robots: "A missing or misconfigured robots.txt can inadvertently block AI crawlers from indexing your page, making it invisible to systems that rely on crawl data.",
    sitemap: "A sitemap tells crawlers exactly which pages exist and when they were last updated. Without one, new or updated pages are discovered more slowly.",
    alt_text: "Alt text is how AI vision systems and crawlers understand your images. Missing alt text leaves image content invisible to indexing and answer systems.",
    word_count: "Thin content gives AI assistants very little to extract or cite. Pages with insufficient depth are rarely chosen as sources for detailed answers.",
    internal_links: "Internal links help AI crawlers discover related pages and understand your site structure. Few internal links means important pages get crawled less frequently.",
    structured_density: "Pages with multiple relevant schema types give AI systems a richer, more confident picture of your content — increasing citation likelihood across more query types.",
  };
  return map[id] ?? "Weak signals reduce how confidently AI assistants and search systems can understand and cite this page.";
}

function recommendedFix(check: CheckResult) {
  if (check.id === "title") return "Rewrite the title to include the primary offer and audience in 30-60 characters.";
  if (check.id === "meta_desc") return "Add a clear 120-160 character meta description with problem, solution, and proof.";
  if (check.id === "h1") return "Use one H1 that states exactly what the page offers and who it is for.";
  if (check.id === "heading_structure") return "Restructure sections with H2 and H3 hierarchy to improve crawl and comprehension.";
  if (check.id.includes("schema")) return "Add JSON-LD for Organization, WebSite, WebPage, FAQPage, and page-relevant entities.";
  if (check.id === "https") return "Serve the page on HTTPS and redirect all HTTP requests.";
  if (check.id === "robots") return "Publish a crawl-safe robots.txt and validate it in search tools.";
  if (check.id === "sitemap") return "Create sitemap.xml and submit it to search indexing tools.";
  if (check.id === "word_count") return "Add use-case detail, proof points, and concise FAQ blocks.";
  if (check.id === "internal_links") return "Add contextual internal links to product, proof, and FAQ pages.";
  return "Improve this signal to increase answer-engine confidence and citation readiness.";
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

function badgeTone(value: Priority | Impact | Effort) {
  if (value === "critical") return "badge-critical";
  if (value === "high") return "badge-high";
  if (value === "medium") return "badge-medium";
  if (value === "low") return "badge-low";
  if (value === "hard") return "badge-high";
  if (value === "easy") return "badge-low";
  return "badge-medium";
}


function inferChecklistGroups(items: string[]) {
  const groups: Record<"Schema" | "Content" | "Metadata" | "Trust Signals" | "Technical", Array<{ text: string; effort: Effort; impact: Impact }>> = {
    Schema: [],
    Content: [],
    Metadata: [],
    "Trust Signals": [],
    Technical: [],
  };
  for (const item of items) {
    const lower = item.toLowerCase();
    const effort: Effort = lower.includes("add") ? "easy" : lower.includes("improve") ? "medium" : "hard";
    const impact: Impact = lower.includes("schema") || lower.includes("h1") ? "high" : "medium";
    if (lower.includes("schema")) groups.Schema.push({ text: item, effort, impact });
    else if (lower.includes("faq") || lower.includes("content") || lower.includes("use-case")) groups.Content.push({ text: item, effort, impact });
    else if (lower.includes("title") || lower.includes("meta")) groups.Metadata.push({ text: item, effort, impact });
    else if (lower.includes("trust") || lower.includes("proof")) groups["Trust Signals"].push({ text: item, effort, impact });
    else groups.Technical.push({ text: item, effort, impact });
  }
  return groups;
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
  const isPro = canViewFullReport(plan);
  const isAdmin = isMasterAdmin(plan);
  const host = useMemo(() => {
    try {
      return new URL(report.url).hostname.replace(/^www\./, "");
    } catch {
      return "this website";
    }
  }, [report.url]);

  const issues = useMemo(
    () => normalizeIssues(checks).filter((issue) => checks.find((c) => c.id === issue.id)?.status !== "pass"),
    [checks]
  );
  const visibleIssues = isPro ? issues : issues.slice(0, 3);
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
        ? `${report.pagespeed.score}/100 — page speed and Core Web Vitals affect how reliably AI crawlers can index your content.`
        : "PageSpeed score unavailable — the performance API did not return data for this page.",
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
  const detectedSchemaTypes = report.aiInsights?.schemaRecommendations?.detected ?? [];
  const missingSchemaTypes = report.aiInsights?.schemaRecommendations?.missing ?? [];
  const prioritySchema = report.aiInsights?.schemaRecommendations?.priority ?? null;
  const priorityReasoning = report.aiInsights?.schemaRecommendations?.reasoning ?? "";
  const otherSuggestedTypes = missingSchemaTypes.filter((t) => t !== prioritySchema);
  const checklist = [
    "Add FAQ section to key landing pages",
    "Add FAQPage schema using real customer questions",
    "Add Organization + WebSite + WebPage schema",
    "Improve H1 clarity for primary offer and audience",
    "Expand page copy with use cases and proof",
    "Add stronger trust signals above the fold",
    "Improve internal links to product and FAQ pages",
  ];
  const checklistGroups = useMemo(() => inferChecklistGroups(checklist), []);

  const copyReport = async () => {
    const lines = [
      `AnswerRank Scanner - AI Visibility Readiness Report`,
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
    if (!canDownloadPdf(plan)) return;
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
              <span className="badge">{isPro ? "Pro Report" : "Free Preview"}</span>
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
                      <span className={`mini-pill ${badgeTone(issue.impact)}`}>↑ {issue.impact}</span>
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
                    {isPro && issue.example && (
                      <pre className="report-code-block">{issue.example}</pre>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
        {!isPro && hiddenCount > 0 && (
          <div className="locked-panel">
            <Lock className="h-4 w-4" />
            <p>{hiddenCount} more issues are included in the Pro report.</p>
            <UpgradeButton>Unlock Full Report</UpgradeButton>
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
                      <p>{priorityReasoning}</p>
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
              {otherSuggestedTypes.includes("FAQPage") && (
                <p className="schema-note">Google deprecated FAQ rich results in May 2026, but FAQPage schema remains useful for AI answer engines like ChatGPT and Perplexity.</p>
              )}
            </div>
          )}
        </section>
      )}

      <section className="surface report-card print-section">
        <h3 className="section-heading">Implementation Roadmap</h3>
        <p className="section-kicker mt-1">Prioritized action list with effort estimates — start at the top and work down.</p>
        {isPro ? (
          <div className="roadmap-grid mt-4">
            {Object.entries(checklistGroups).map(([group, items]) => (
              <article key={group} className="roadmap-group-card">
                <h4>{group}</h4>
                <div className="roadmap-group-items">
                  {items.length ? items.map((item) => (
                    <div key={`${group}-${item.text}`} className="roadmap-item-row">
                      <div className="roadmap-item-main">
                        <CheckCircle2 className="h-4 w-4" />
                        <p>{item.text}</p>
                      </div>
                      <div className="issue-pill-row roadmap-pill-row">
                        <span className={`mini-pill ${badgeTone(item.impact)}`}>impact {item.impact}</span>
                        <span className={`mini-pill ${badgeTone(item.effort)}`}>effort {item.effort}</span>
                      </div>
                    </div>
                  )) : <p className="muted-copy">Not detected from page content.</p>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="locked-panel">
            <Lock className="h-4 w-4" />
            <p>Unlock full roadmap with grouped checklist items and implementation sequencing.</p>
            <UpgradeButton>Upgrade to Pro Report</UpgradeButton>
          </div>
        )}
      </section>

      <section className="surface report-card print-section">
        <h3 className="section-heading">PDF Export</h3>
        <div className="pdf-card-grid mt-4">
          <div>
            <p className="section-kicker">Included sections:</p>
            <ul className="pdf-includes-list">
              <li>Executive summary</li>
              <li>Score breakdown</li>
              <li>Priority action plan</li>
              <li>Detailed issues</li>
              <li>Schema recommendations</li>
              <li>FAQ schema guidance</li>
              <li>Implementation roadmap</li>
            </ul>
          </div>
          <div className="pdf-action-card">
            <div className="pdf-preview-mini" aria-hidden="true">
              <span>AnswerRank Scanner</span>
              <strong>AI Visibility Report</strong>
              <small>{host}</small>
              <em>{report.score}/100 - {scoreStatus}</em>
            </div>
            <strong>Client-shareable audit PDF</strong>
            <p>A clean, professional report you can share directly with clients or your team — no formatting work needed.</p>
            {canDownloadPdf(plan) ? (
              <button className="btn btn-primary" onClick={downloadPdf}><Download className="h-4 w-4" /> Download PDF</button>
            ) : (
              <>
                <div className="locked-inline"><Lock className="h-4 w-4" /> PDF export is available on Pro.</div>
                <UpgradeButton>Unlock Full Report + PDF</UpgradeButton>
              </>
            )}
          </div>
        </div>
      </section>

      <div className="report-action-row flex flex-col justify-center gap-3 sm:flex-row print-hidden">
        <button onClick={copyReport} className="btn btn-secondary">
          <Copy className="h-4 w-4" /> {copyOk ? "Copied" : "Copy report summary"}
        </button>
        {canDownloadPdf(plan) && (
          <button onClick={downloadPdf} className="btn btn-secondary">
            <Download className="h-4 w-4" /> Download PDF
          </button>
        )}
        {!isPro && <UpgradeButton>Get all fixes + PDF</UpgradeButton>}
        <button onClick={onReset} className="btn btn-primary">
          <RotateCcw className="h-4 w-4" /> Scan another URL
        </button>
      </div>
    </div>
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
