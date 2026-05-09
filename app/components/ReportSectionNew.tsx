"use client";

import { CheckResult, ScanResult } from "@/types/index";
import ScoreCircle from "./ScoreCircle";
import { AlertCircle, CheckCircle2, Copy, Crown, Download, ExternalLink, Lock, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import UpgradeButton from "./UpgradeButton";
import { getSafeSupabaseSession, getSupabaseBrowserClient } from "@/lib/supabase-browser";

interface Props {
  report: ScanResult;
  onReset: () => void;
}

type Priority = "critical" | "high" | "medium" | "low";
type Impact = "high" | "medium" | "low";
type Effort = "easy" | "medium" | "hard";
type Category = "schema" | "metadata" | "content" | "performance" | "trust" | "ai-readiness" | "headings";

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

type Plan = "guest" | "free" | "pro" | "agency";

const CATEGORY_LABELS: Record<Category, string> = {
  schema: "Schema",
  metadata: "Metadata",
  content: "Content Clarity",
  performance: "Performance",
  trust: "Trust Signals",
  "ai-readiness": "AI Answer Readiness",
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
  if (check.id.includes("schema")) return "Add JSON-LD for Organization, WebPage, FAQPage, and page-relevant entity schema.";
  if (check.id === "https") return "Serve the page on HTTPS and redirect all HTTP requests.";
  if (check.id === "robots") return "Publish a crawl-safe robots.txt and validate it in search tools.";
  if (check.id === "sitemap") return "Create sitemap.xml and submit it to search indexing tools.";
  if (check.id === "word_count") return "Add use-case detail, proof points, and concise FAQ blocks.";
  if (check.id === "internal_links") return "Add contextual internal links to service, proof, and FAQ pages.";
  return "Improve this signal to increase answer-engine confidence and citation readiness.";
}

function issueExample(check: CheckResult) {
  if (check.id.includes("schema")) {
    return `{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "What does your product do?",
    "acceptedAnswer": { "@type": "Answer", "text": "Short clear answer." }
  }]
}`;
  }
  if (check.id === "title") return "Example title: AI Visibility Audit for SaaS Landing Pages | AnswerRank";
  if (check.id === "meta_desc") return "Example description: Scan any SaaS landing page and get a 60-second AI visibility audit with prioritized fixes.";
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

function badgeTone(value: string) {
  if (value === "critical" || value === "high") return "badge-danger";
  if (value === "medium") return "badge-warn";
  return "badge-neutral";
}

function getChecklist() {
  return [
    "Add FAQ section to homepage",
    "Add FAQPage schema",
    "Add Organization schema",
    "Improve H1 clarity",
    "Add use-case section",
    "Add comparison/alternative content",
    "Add trust signals above the fold",
  ];
}

function getFaqs(host: string) {
  return [
    { q: `What does ${host} help teams do?`, a: `${host} helps teams improve AI visibility with structured, answer-ready page signals.` },
    { q: `Who is ${host} best for?`, a: "It is best for SaaS teams, growth marketers, and founders optimizing discoverability." },
    { q: `How is ${host} different from a basic SEO audit?`, a: "It focuses on AI answer-readiness, schema clarity, and citation confidence." },
    { q: `What should we fix first?`, a: "Start with critical schema/metadata gaps, then improve content clarity and trust signals." },
    { q: `How often should pages be rescanned?`, a: "Rescan after major copy, schema, or structural updates to validate progress." },
  ];
}

export default function ReportSectionNew({ report, onReset }: Props) {
  const [notice, setNotice] = useState("");
  const [plan, setPlan] = useState<Plan>("guest");
  const [copyOk, setCopyOk] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const checks = report.checks;

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

  const isPro = plan === "pro" || plan === "agency";
  const host = useMemo(() => {
    try {
      return new URL(report.url).hostname.replace(/^www\./, "");
    } catch {
      return "your company";
    }
  }, [report.url]);
  const issues = useMemo(
    () => normalizeIssues(checks).filter((issue) => checks.find((c) => c.id === issue.id)?.status !== "pass"),
    [checks]
  );
  const critical = issues.filter((i) => i.priority === "critical");
  const high = issues.filter((i) => i.priority === "high");
  const nice = issues.filter((i) => i.priority === "medium" || i.priority === "low");
  const visibleIssues = isPro ? issues : issues.slice(0, 3);
  const hiddenCount = Math.max(0, issues.length - visibleIssues.length);
  const scoreStatus = statusLabel(report.score);
  const diagnosis = issues[0]?.problem ?? "Core visibility signals are in good shape.";
  const topOpportunity = issues[0]?.recommendedFix ?? "Keep schema and answer blocks current as pages evolve.";

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

    if (report.pagespeed?.score !== undefined) {
      groups.performance.push(report.pagespeed.score);
    }

    return (Object.entries(groups) as Array<[Category, number[]]>).map(([category, values]) => ({
      category,
      score: values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0,
    }));
  }, [checks, report.pagespeed?.score]);

  const schemaSuggestions = [
    "Organization",
    "WebPage",
    "FAQPage",
    "BreadcrumbList",
    "Product or Service",
  ];
  const detectedSchema = checks.some((check) => check.id === "schema_present" && check.status === "pass");
  const faqs = getFaqs(host);
  const checklist = getChecklist();

  const copyReport = async () => {
    const lines = [
      `AnswerRank Report - ${report.url}`,
      `Score: ${report.score} (${scoreStatus})`,
      `Scanned: ${new Date(report.scannedAt).toLocaleString()}`,
      "",
      "Top Issues:",
      ...visibleIssues.map((issue, i) => `${i + 1}. ${issue.title} [${issue.priority}] - ${issue.recommendedFix}`),
    ];
    if (isPro) {
      lines.push("", "Implementation Checklist:", ...checklist.map((item) => `- ${item}`));
    }
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopyOk(true);
    setTimeout(() => setCopyOk(false), 1500);
  };

  const downloadPdf = () => {
    if (!isPro) return;
    window.print();
  };

  return (
    <div className="report-shell report-stack pb-8">
      <section className="surface report-hero">
        <div className="report-hero-grid">
          <ScoreCircle score={report.score} />
          <div className="report-hero-copy">
            <div className="report-hero-badges">
              <span className="badge">{isPro ? "Pro Report" : "Free Preview"}</span>
              <span className="badge">AI Assisted</span>
              <span className="badge">Local Scan</span>
              <span className="badge">{scoreStatus}</span>
            </div>
            <h2 className="report-title break-words">{report.url}</h2>
            <a href={report.url} target="_blank" rel="noreferrer" className="report-open-link">
              Open page <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <div className="report-save-panel">
              <div><span>Main diagnosis</span><strong>{diagnosis}</strong></div>
              <div><span>Top opportunity</span><strong>{topOpportunity}</strong></div>
            </div>
          </div>
        </div>
      </section>

      <section className="surface report-card">
        <h3 className="section-heading">Score Breakdown</h3>
        <p className="section-kicker mt-1">Category-level readiness for AI visibility.</p>
        <div className="summary-score-grid executive-metric-grid mt-4">
          {categoryScores.map((item) => (
            <div key={item.category} className="metric-tile metric-neutral">
              <span>{CATEGORY_LABELS[item.category]}</span>
              <strong>{item.score}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="report-command-grid">
        <div className="surface report-card">
          <div className="command-card-label">Critical Fixes</div>
          <div className="priority-stack">
            {critical.slice(0, 5).map((item) => <PriorityRow key={item.id} item={item} />)}
            {!critical.length && <p className="muted-copy">No critical blockers detected.</p>}
          </div>
        </div>
        <div className="surface report-card">
          <div className="command-card-label">High-Impact Fixes</div>
          <div className="priority-stack">
            {high.slice(0, 5).map((item) => <PriorityRow key={item.id} item={item} />)}
            {!high.length && <p className="muted-copy">No high-impact blockers detected.</p>}
          </div>
        </div>
        <div className="surface report-card">
          <div className="command-card-label">Nice-to-Have Fixes</div>
          <div className="priority-stack">
            {nice.slice(0, 5).map((item) => <PriorityRow key={item.id} item={item} />)}
            {!nice.length && <p className="muted-copy">Core quality baseline looks solid.</p>}
          </div>
        </div>
      </section>

      <section className="surface report-card">
        <h3 className="section-heading">Detailed Issues</h3>
        <p className="section-kicker mt-1">Priority, impact, effort, and implementation guidance.</p>
        <div className="audit-detail-grid mt-4">
          {visibleIssues.map((issue) => (
            <button key={issue.id} type="button" className="audit-card audit-warn" onClick={() => setExpanded(expanded === issue.id ? null : issue.id)}>
              <div className="audit-card-top">
                <div className="audit-card-title">
                  <AlertCircle className="h-4 w-4 text-amber-300" />
                  <div>
                    <span>{CATEGORY_LABELS[issue.category]}</span>
                    <strong>{issue.title}</strong>
                  </div>
                </div>
                <div className="audit-weight"><span>Priority</span><strong>{issue.priority}</strong></div>
              </div>
              <div className="audit-card-body">
                <div className="report-badge-row">
                  <span className={`report-mini-badge ${badgeTone(issue.priority)}`}>{issue.priority}</span>
                  <span className={`report-mini-badge ${badgeTone(issue.impact)}`}>impact: {issue.impact}</span>
                  <span className="report-mini-badge badge-neutral">effort: {issue.effort}</span>
                </div>
                <p>{issue.problem}</p>
              </div>
              {expanded === issue.id && (
                <div className="audit-action">
                  <span>Why it matters</span>
                  <p>{issue.whyItMatters}</p>
                  <span>Recommended fix</span>
                  <p>{issue.recommendedFix}</p>
                  {isPro && issue.example && (
                    <>
                      <span>Example</span>
                      <pre className="report-code-block">{issue.example}</pre>
                    </>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>

        {!isPro && hiddenCount > 0 && (
          <div className="locked-panel">
            <Lock className="h-4 w-4" />
            <p>{hiddenCount} additional issues are locked in Free Preview.</p>
            <div className="locked-actions">
              <UpgradeButton>Unlock Full Report</UpgradeButton>
              <span>Get all fixes + PDF</span>
            </div>
          </div>
        )}
      </section>

      <section className="surface report-card">
        <h3 className="section-heading">Schema Recommendations</h3>
        <p className="section-kicker mt-1">{detectedSchema ? "Schema was detected. Expand coverage for better answer extraction." : "Schema is missing or partial. Add structured data next."}</p>
        <div className="pro-check-row" style={{ marginTop: 14 }}>
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          <div>
            <strong>Suggested schema types</strong>
            <p>{schemaSuggestions.join(", ")}</p>
          </div>
        </div>
        {isPro ? (
          <pre className="report-code-block mt-3">{`{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "${host}",
  "url": "${report.url}",
  "sameAs": ["https://linkedin.com/company/your-brand"]
}`}</pre>
        ) : (
          <div className="locked-inline">
            <Lock className="h-4 w-4" /> Full schema implementation guidance is in Pro.
          </div>
        )}
      </section>

      <section className="surface report-card">
        <h3 className="section-heading">Recommended FAQs</h3>
        <p className="section-kicker mt-1">Questions your page should answer clearly.</p>
        <div className="pro-faq-grid mt-3">
          {(isPro ? faqs : faqs.slice(0, 2)).map((item) => (
            <p key={item.q}><span>Q</span><strong>{item.q}</strong><br />{isPro ? item.a : "Answer template unlocked in Pro report."}</p>
          ))}
        </div>
      </section>

      <section className="surface report-card">
        <h3 className="section-heading">Implementation Checklist</h3>
        {isPro ? (
          <div className="priority-stack mt-3">
            {checklist.map((item) => (
              <div key={item} className="pro-check-row">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                <div><strong>{item}</strong></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="locked-panel">
            <Lock className="h-4 w-4" />
            <p>Unlock full checklist, all detailed fixes, and PDF export.</p>
            <UpgradeButton>Upgrade to Pro Report</UpgradeButton>
          </div>
        )}
      </section>

      <section className="surface report-card">
        <h3 className="section-heading">PDF Download</h3>
        <p className="section-kicker mt-1">Export this audit as PDF using browser print layout.</p>
        {isPro ? (
          <button className="btn btn-primary mt-3" onClick={downloadPdf}>
            <Download className="h-4 w-4" /> Download PDF
          </button>
        ) : (
          <div className="locked-inline"><Lock className="h-4 w-4" /> PDF download is available on Pro.</div>
        )}
      </section>

      <div className="report-action-row flex flex-col justify-center gap-3 sm:flex-row">
        <button onClick={copyReport} className="btn btn-secondary">
          <Copy className="h-4 w-4" /> {copyOk ? "Copied" : "Copy report summary"}
        </button>
        {!isPro && <UpgradeButton>Get all fixes + PDF</UpgradeButton>}
        <button onClick={onReset} className="btn btn-primary">
          <RotateCcw className="h-4 w-4" /> Scan another URL
        </button>
      </div>

      {!isPro && (
        <section className="surface pro-card">
          <div className="pro-cta-panel">
            <strong><Crown className="h-4 w-4" /> Pro Report Value</strong>
            <p>Full issue breakdown, step-by-step fixes, schema recommendations, recommended FAQs, PDF download, and implementation checklist.</p>
            <UpgradeButton>Unlock Full Report</UpgradeButton>
          </div>
        </section>
      )}

      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}

function PriorityRow({ item }: { item: ReportIssue }) {
  return (
    <div className={`priority-compact priority-warn`}>
      <div>
        <Sparkles className="h-4 w-4" />
        <span>{item.title}</span>
      </div>
      <strong>{item.priority}</strong>
    </div>
  );
}
