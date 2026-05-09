"use client";

import { CheckResult, ScanResult } from "@/types/index";
import ScoreCircle from "./ScoreCircle";
import { AlertCircle, CheckCircle2, Copy, Download, ExternalLink, Lock, RotateCcw, TrendingUp, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import UpgradeButton from "./UpgradeButton";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { canDownloadPdf, canViewFullReport, isMasterAdmin } from "@/lib/access";

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
  jsonLd: string;
  inferred: boolean;
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
  if (check.id.includes("schema")) {
    return `{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "What does this product do?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "It improves AI visibility."
    }
  }]
}`;
  }
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
      whyItMatters: "Weak signals reduce how confidently AI assistants and search systems can understand and cite this page.",
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

function getFaqs(host: string) {
  return [
    { q: `What does ${host} help teams do?`, a: `${host} helps teams improve AI visibility with structured, answer-ready page signals.` },
    { q: `Who is ${host} best for?`, a: "It is best for SaaS teams, growth marketers, and founders optimizing discoverability." },
    { q: `How is this different from a standard SEO audit?`, a: "It focuses on AI answer-readiness, schema clarity, and citation confidence." },
    { q: "What should we fix first?", a: "Start with critical schema/metadata gaps, then improve content clarity and trust signals." },
    { q: "How often should pages be rescanned?", a: "Rescan after major copy, schema, or structure updates to validate progress." },
  ];
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
  const orgName = host.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  const faqJson = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: getFaqs(host).slice(0, 2).map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
  const graph: Array<Record<string, unknown>> = [
    {
      "@type": "Organization",
      "@id": `${report.url}#organization`,
      name: orgName || host,
      url: report.url,
    },
    {
      "@type": "WebSite",
      "@id": `${report.url}#website`,
      url: report.url,
      name: orgName || host,
    },
    {
      "@type": "WebPage",
      "@id": `${report.url}#webpage`,
      url: report.url,
      isPartOf: { "@id": `${report.url}#website` },
    },
    faqJson,
  ];

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
    jsonLd: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2),
    inferred: true,
  };
}

export default function ReportSectionNew({ report, onReset }: Props) {
  const [plan, setPlan] = useState<Plan>("guest");
  const [copyOk, setCopyOk] = useState(false);
  const [schemaCopyOk, setSchemaCopyOk] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

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
      title: "Estimated impact",
      text: report.pagespeed?.score !== undefined
        ? `Performance score is ${report.pagespeed.score}/100. Resolving priority issues should increase visibility confidence.`
        : "Performance score was not detected from page content.",
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
  const faqs = useMemo(() => getFaqs(host), [host]);
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

  const copySchema = async () => {
    await navigator.clipboard.writeText(schemaRecommendation.jsonLd);
    setSchemaCopyOk(true);
    setTimeout(() => setSchemaCopyOk(false), 1500);
  };

  const downloadPdf = () => {
    if (!canDownloadPdf(plan)) return;
    window.print();
  };

  return (
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
        <p className="section-kicker mt-1">Category-level readiness with status indicators.</p>
        <div className="score-breakdown-grid mt-4">
          {categoryScores.map((item) => (
            <div key={item.category} className="score-breakdown-card">
              <div className="score-breakdown-head">
                <span>{CATEGORY_LABELS[item.category]}</span>
                <strong>{item.score}</strong>
              </div>
              <div className="score-bar"><span className="score-bar-fill" style={{ width: `${item.score}%` }} /></div>
              <small>{item.status}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="surface report-card print-section">
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
        <p className="section-kicker mt-1">Problem, impact, effort, and implementation guidance.</p>
        <div className="detailed-issues-list mt-4">
          {visibleIssues.map((issue) => (
            <article key={issue.id} className="issue-accordion-card">
              <button className="issue-accordion-toggle" onClick={() => setExpanded(expanded === issue.id ? null : issue.id)} type="button">
                <div>
                  <span>{CATEGORY_LABELS[issue.category]}</span>
                  <strong>{issue.title}</strong>
                </div>
                <div className="issue-pill-row">
                  <span className={`mini-pill ${badgeTone(issue.priority)}`}>{issue.priority}</span>
                  <span className={`mini-pill ${badgeTone(issue.impact)}`}>impact {issue.impact}</span>
                  <span className={`mini-pill ${badgeTone(issue.effort)}`}>effort {issue.effort}</span>
                </div>
              </button>
              <div className="issue-problem-row">
                <AlertCircle className="h-4 w-4" />
                <p>{issue.problem}</p>
              </div>
              {expanded === issue.id && (
                <div className="issue-expanded">
                  <p><strong>Why it matters:</strong> {issue.whyItMatters}</p>
                  <p><strong>Recommended fix:</strong> {issue.recommendedFix}</p>
                  {isPro && issue.example && <pre className="report-code-block">{issue.example}</pre>}
                </div>
              )}
            </article>
          ))}
        </div>
        {!isPro && hiddenCount > 0 && (
          <div className="locked-panel">
            <Lock className="h-4 w-4" />
            <p>{hiddenCount} additional issues are locked in Free Preview.</p>
            <UpgradeButton>Unlock Full Report</UpgradeButton>
          </div>
        )}
      </section>

      <section className="surface report-card print-section">
        <h3 className="section-heading">Schema Recommendations</h3>
        <p className="section-kicker mt-1">Generated from detected page signals. Review before publishing.</p>
        <div className="schema-layout mt-4">
          <div className="schema-meta">
            <article>
              <h4>Detected schema types</h4>
              <ul>{schemaRecommendation.detected.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
            <article>
              <h4>Suggested schema types</h4>
              <ul>{schemaRecommendation.suggested.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
            <article>
              <h4>Missing opportunities</h4>
              <ul>
                {schemaRecommendation.missing.length
                  ? schemaRecommendation.missing.map((item) => <li key={item}>{item}</li>)
                  : <li>No major schema gaps detected from this scan.</li>}
              </ul>
            </article>
            <article>
              <h4>Why this is recommended</h4>
              <ul>{schemaRecommendation.reasons.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
            <p className="schema-note">
              {schemaRecommendation.inferred
                ? "Generated from detected page content. Review before publishing."
                : "Schema suggestions are based on detected on-page structured data."}
            </p>
          </div>
          {isPro ? (
            <div className="schema-code-shell">
              <div className="schema-code-head">
                <strong>Suggested JSON-LD</strong>
                <button type="button" className="btn btn-secondary" onClick={copySchema}>{schemaCopyOk ? "Copied" : "Copy JSON-LD"}</button>
              </div>
              <pre className="report-code-block">{schemaRecommendation.jsonLd}</pre>
            </div>
          ) : (
            <div className="locked-panel">
              <Lock className="h-4 w-4" />
              <p>Full schema implementation JSON-LD is available on Pro.</p>
              <UpgradeButton>Unlock Schema Implementation</UpgradeButton>
            </div>
          )}
        </div>
      </section>

      <section className="surface report-card print-section">
        <h3 className="section-heading">Recommended FAQs</h3>
        <p className="section-kicker mt-1">Answer-focused FAQs for AI readability and citation coverage.</p>
        <div className="faq-grid-premium mt-4">
          {(isPro ? faqs : faqs.slice(0, 2)).map((item) => (
            <article className="faq-card-premium" key={item.q}>
              <span>Q</span>
              <h4>{item.q}</h4>
              <p>{isPro ? item.a : "Answer template unlocked in Pro report."}</p>
            </article>
          ))}
          {!isPro && (
            <article className="faq-card-premium faq-locked">
              <Lock className="h-4 w-4" />
              <h4>More FAQs are available in Pro</h4>
              <p>Unlock complete answer templates and implementation guidance.</p>
              <UpgradeButton>Unlock Full FAQ Set</UpgradeButton>
            </article>
          )}
        </div>
      </section>

      <section className="surface report-card print-section">
        <h3 className="section-heading">Implementation Roadmap</h3>
        <p className="section-kicker mt-1">Grouped execution plan by category, effort, and impact.</p>
        {isPro ? (
          <div className="roadmap-grid mt-4">
            {Object.entries(checklistGroups).map(([group, items]) => (
              <article key={group} className="roadmap-group-card">
                <h4>{group}</h4>
                <div className="roadmap-group-items">
                  {items.length ? items.map((item) => (
                    <div key={`${group}-${item.text}`} className="roadmap-item-row">
                      <CheckCircle2 className="h-4 w-4" />
                      <p>{item.text}</p>
                      <div className="issue-pill-row">
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
              <li>Recommended FAQs</li>
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
            <p>Print-optimized white report style with clean section breaks and readable typography.</p>
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
            <div className="action-plan-item-text">
              <p>{item.title}</p>
              <small>{item.problem}</small>
            </div>
            <span className={`mini-pill ${badgeTone(tone)}`}>{item.priority}</span>
          </div>
        )) : <p className="muted-copy">No issues in this group.</p>}
      </div>
    </article>
  );
}
