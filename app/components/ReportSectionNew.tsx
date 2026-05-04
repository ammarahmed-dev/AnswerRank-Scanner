"use client";

import { CheckResult, ScanResult } from "@/types/index";
import ScoreCircle from "./ScoreCircle";
import {
  CheckCircle2,
  Copy,
  Crown,
  ExternalLink,
  AlertCircle,
  Info,
  Lightbulb,
  Lock,
  RotateCcw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { ReactNode, useEffect, useMemo, useState } from "react";

interface Props {
  report: ScanResult;
  onReset: () => void;
}

type CompetitorResult = {
  url: string;
  score: number;
  metrics: {
    overall: number;
    entity: number;
    schema: number;
    proof: number;
  };
};

const statusColors = {
  pass: "audit-pass",
  warn: "audit-warn",
  fail: "audit-fail",
};

const statusIcons = {
  pass: <CheckCircle2 className="h-4 w-4 text-emerald-300" />,
  warn: <AlertCircle className="h-4 w-4 text-amber-300" />,
  fail: <AlertCircle className="h-4 w-4 text-red-300" />,
};

const statusLabels = {
  pass: "Passing",
  warn: "Needs attention",
  fail: "Critical issue",
};

const statusAdvice = {
  pass: "This signal is in good shape. Keep it consistent as the page evolves.",
  warn: "This is usable, but tightening it will improve AI and search confidence.",
  fail: "Prioritize this fix. Missing or weak signals can reduce visibility and trust.",
};

const CHECK_GROUPS: Record<string, string> = {
  title: "Metadata",
  meta_desc: "Metadata",
  h1: "Content Structure",
  heading_structure: "Content Structure",
  schema_present: "Schema",
  faq_schema: "Schema",
  article_schema: "Schema",
  og_tags: "Social Preview",
  og_image: "Social Preview",
  https: "Technical Trust",
  robots: "Indexing",
  sitemap: "Indexing",
  alt_text: "Accessibility",
  word_count: "Content Depth",
  internal_links: "Site Architecture",
  structured_density: "Schema",
};

function getAction(check: CheckResult) {
  if (check.status === "pass") return "Monitor this during future content updates.";
  if (check.id === "title") return "Rewrite the title to be clear, specific, and close to 30-60 characters.";
  if (check.id === "meta_desc") return "Add a concise benefit-led meta description around 120-160 characters.";
  if (check.id === "h1") return "Use one clear H1 that names the primary page topic or offer.";
  if (check.id === "heading_structure") return "Organize sections with H2s first, then H3s underneath them.";
  if (check.id.includes("schema")) return "Add JSON-LD for the page type, FAQs, organization, and key entities where relevant.";
  if (check.id === "og_tags") return "Add Open Graph title and description for richer previews.";
  if (check.id === "og_image") return "Set a high-quality social preview image.";
  if (check.id === "https") return "Serve the page over HTTPS before promoting it.";
  if (check.id === "robots") return "Expose and review robots.txt so crawlers can understand access rules.";
  if (check.id === "sitemap") return "Publish sitemap.xml and submit it to search tools.";
  if (check.id === "alt_text") return "Add descriptive alt text to meaningful images.";
  if (check.id === "word_count") return "Expand the page with clearer proof, FAQs, use cases, and entity-rich copy.";
  if (check.id === "internal_links") return "Add contextual internal links to relevant service, proof, and FAQ pages.";
  return "Review this signal and bring it closer to the recommended standard.";
}

function getEffort(check: CheckResult) {
  if (check.id.includes("schema")) return "Medium";
  if (check.id === "word_count" || check.id === "heading_structure") return "Medium";
  return "Low";
}

function getSchemaChecklist(checks: CheckResult[]) {
  const hasSchema = checks.some((check) => check.id === "schema_present" && check.status === "pass");
  const hasFaq = checks.some((check) => check.id === "faq_schema" && check.status === "pass");
  const hasArticle = checks.some((check) => check.id === "article_schema" && check.status === "pass");

  return [
    { title: "Organization schema", done: hasSchema, detail: "Identify brand name, URL, logo, social profiles, and primary contact points." },
    { title: "WebPage schema", done: hasSchema, detail: "Describe the page topic, canonical URL, primary entity, and publisher." },
    { title: "FAQPage schema", done: hasFaq, detail: "Add concise question/answer pairs for buyer objections and AI answer extraction." },
    { title: "Article or BlogPosting schema", done: hasArticle, detail: "Use when the page is educational, editorial, or guide-style content." },
    { title: "BreadcrumbList schema", done: false, detail: "Clarify where this page sits in the site hierarchy." },
    { title: "SameAs entity links", done: false, detail: "Connect the brand to authoritative profiles and proof sources." },
  ];
}

function getRecommendedFaqs(report: ScanResult) {
  const host = (() => {
    try {
      return new URL(report.url).hostname.replace(/^www\./, "");
    } catch {
      return "this company";
    }
  })();

  const base = [
    `What does ${host} help customers do?`,
    `Who is ${host} best suited for?`,
    `What problem does ${host} solve?`,
    `How is ${host} different from alternatives?`,
    `What proof or results does ${host} provide?`,
    `How does pricing or engagement work?`,
    `What should a new customer do first?`,
    `Which use cases does ${host} support?`,
    `What integrations, process, or requirements should customers know?`,
    `How can someone contact or evaluate ${host}?`,
  ];

  const fromAI = report.aiInsights?.recommendations
    .slice(0, 3)
    .map((rec) => `How should the page address: ${rec.replace(/[.?!]$/, "")}?`) ?? [];

  return [...fromAI, ...base].slice(0, 10);
}

function getAiBreakdown(report: ScanResult) {
  const failed = report.checks.filter((check) => check.status === "fail").length;
  const warnings = report.checks.filter((check) => check.status === "warn").length;
  const schemaOk = report.checks.some((check) => check.id.includes("schema") && check.status === "pass");

  return [
    { label: "Entity clarity", value: report.score >= 70 ? "Strong" : "Needs sharpening", detail: "Make the brand, audience, offer, and category explicit in headings and metadata." },
    { label: "Answer readiness", value: failed ? "Limited" : "Good", detail: failed ? `${failed} critical signals reduce confidence for AI summaries.` : "Core signals are present enough for a clear summary." },
    { label: "Schema coverage", value: schemaOk ? "Detected" : "Missing", detail: schemaOk ? "Structured data exists; expand it with FAQ and entity detail." : "Add JSON-LD so answer engines can parse page meaning directly." },
    { label: "Content depth", value: warnings > 4 ? "Thin areas found" : "Usable", detail: "Add proof, FAQs, use cases, and decision criteria where the page is light." },
  ];
}

function checkValue(checks: CheckResult[], id: string) {
  const status = checks.find((check) => check.id === id)?.status;
  if (status === "pass") return 100;
  if (status === "warn") return 60;
  return 20;
}

function average(values: number[]) {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getCurrentMetrics(report: ScanResult) {
  return {
    overall: report.score,
    entity: average([checkValue(report.checks, "title"), checkValue(report.checks, "meta_desc"), checkValue(report.checks, "h1")]),
    schema: average([checkValue(report.checks, "schema_present"), checkValue(report.checks, "faq_schema")]),
    proof: average([checkValue(report.checks, "word_count"), checkValue(report.checks, "alt_text"), checkValue(report.checks, "internal_links")]),
  };
}

export default function ReportSectionNew({ report, onReset }: Props) {
  const { url, score, checks, aiInsights, pagespeed, scannedAt } = report;
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [competitorUrls, setCompetitorUrls] = useState("");
  const [competitors, setCompetitors] = useState<CompetitorResult[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState("");

  const passChecks = checks.filter((c) => c.status === "pass");
  const warnChecks = checks.filter((c) => c.status === "warn");
  const failChecks = checks.filter((c) => c.status === "fail");
  const schemaDetected = checks.some((c) => c.id.toLowerCase().includes("schema") && c.status === "pass");
  const readinessLabel = score >= 75 ? "Strong" : score >= 50 ? "Needs Work" : "At Risk";
  const entityNodes = ["Brand", "Category", "Audience", "Use Cases", "Proof", "FAQs", "Schema"];
  const priorityChecks = useMemo(
    () => [...failChecks, ...warnChecks].sort((a, b) => b.weight - a.weight).slice(0, 4),
    [failChecks, warnChecks]
  );
  const roadmap = useMemo(() => [...failChecks, ...warnChecks].sort((a, b) => b.weight - a.weight).slice(0, 6), [failChecks, warnChecks]);
  const schemaChecklist = useMemo(() => getSchemaChecklist(checks), [checks]);
  const recommendedFaqs = useMemo(() => getRecommendedFaqs(report), [report]);
  const aiBreakdown = useMemo(() => getAiBreakdown(report), [report]);
  const currentMetrics = useMemo(() => getCurrentMetrics(report), [report]);
  const reportIdLabel = report.reportId ? report.reportId.slice(0, 8) : "Live scan";

  useEffect(() => {
    if (!report.competitorUrls?.length || competitors.length || compareLoading) return;
    setCompetitorUrls(report.competitorUrls.join("\n"));
    runCompare(report.competitorUrls);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report.competitorUrls]);

  const runCompare = async (urls: string[]) => {
    if (!urls.length) {
      setCompareError("Add at least one competitor URL.");
      return;
    }

    setCompareLoading(true);
    setCompareError("");

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = (await res.json()) as { competitors?: CompetitorResult[]; error?: string };

      if (!res.ok || data.error) {
        setCompareError(data.error ?? "Could not compare these URLs.");
        return;
      }

      setCompetitors(data.competitors ?? []);
    } catch {
      setCompareError("Could not compare these URLs.");
    } finally {
      setCompareLoading(false);
    }
  };

  const handleCompare = async () => {
    const urls = competitorUrls.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean).slice(0, 3);
    await runCompare(urls);
  };

  const handleCopyShareLink = async () => {
    const href = report.reportId
      ? `${window.location.origin}/report?id=${report.reportId}`
      : window.location.href;

    try {
      await navigator.clipboard.writeText(href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      setNotice("Clipboard access was blocked.");
      setTimeout(() => setNotice(""), 3000);
    }
  };

  const handleCopy = async () => {
    const lines = [
      `AnswerRank Report for ${url}`,
      `Score: ${score}/100`,
      `Scanned: ${new Date(scannedAt).toLocaleString()}`,
      "",
      "Passed Checks:",
      ...passChecks.map((c) => `PASS: ${c.label}: ${c.detail}`),
      "",
      "Warnings:",
      ...warnChecks.map((c) => `WARN: ${c.label}: ${c.detail}`),
      "",
      "Failed Checks:",
      ...failChecks.map((c) => `FAIL: ${c.label}: ${c.detail}`),
    ];

    if (aiInsights) {
      lines.push("", "AI Insights:", aiInsights.summary, "", "Quick Win:", aiInsights.quickWin, "", "Recommendations:");
      aiInsights.recommendations.forEach((rec, i) => {
        lines.push(`${i + 1}. ${rec}`);
      });
    }

    lines.push(
      "",
      "Priority Fix Roadmap:",
      ...roadmap.map((check, i) => `${i + 1}. ${check.label} (${getEffort(check)} effort): ${getAction(check)}`),
      "",
      "Schema Checklist:",
      ...schemaChecklist.map((item) => `${item.done ? "DONE" : "TODO"}: ${item.title} - ${item.detail}`),
      "",
      "Recommended FAQs:",
      ...recommendedFaqs.map((faq, i) => `${i + 1}. ${faq}`)
    );

    const text = lines.join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice("Clipboard access was blocked.");
      setTimeout(() => setNotice(""), 3000);
    }
  };

  return (
    <div className="report-shell report-stack pb-8">
      <section className="surface report-hero">
        <div className="report-hero-grid">
          <ScoreCircle score={score} />
          <div className="report-hero-copy">
            <div className="report-hero-badges">
              <span className="eyebrow">Free Local Scan</span>
              <span className="badge">{readinessLabel}</span>
              {aiInsights && <span className="badge">AI Assisted Report</span>}
              <span className="badge">{schemaDetected ? "Schema Detected" : "No Schema Found"}</span>
              {pagespeed && <span className="badge">PageSpeed {pagespeed.score}/100</span>}
              <span className="badge text-xs">{new Date(scannedAt).toLocaleDateString()}</span>
            </div>
            <h2 className="report-title break-words">{url}</h2>
            <a href={url} target="_blank" rel="noreferrer" className="report-open-link">
              Open page <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <div className="report-save-panel">
              <div>
                <span>Saved report</span>
                <strong>{reportIdLabel}</strong>
              </div>
              <div>
                <span>Scanned</span>
                <strong>{new Date(scannedAt).toLocaleString()}</strong>
              </div>
              <button type="button" onClick={handleCopyShareLink} className="btn btn-secondary report-inline-share">
                {shareCopied ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                {shareCopied ? "Copied" : "Copy share link"}
              </button>
            </div>
            {aiInsights && (
              <div className="verdict-box">
                <p className="mb-2 text-sm font-bold text-cyan-100">AI Insights</p>
                <p className="body-copy">{aiInsights.summary}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="report-command-grid">
        <div className="surface report-card command-summary-card">
          <div className="command-card-label">Executive Summary</div>
          <h3>{readinessLabel} readiness, {failChecks.length} critical issue{failChecks.length === 1 ? "" : "s"}</h3>
          <div className="summary-score-grid executive-metric-grid">
            <MetricTile label="Passing" value={passChecks.length} tone="success" />
            <MetricTile label="Warnings" value={warnChecks.length} tone="warning" />
            <MetricTile label="Issues" value={failChecks.length} tone="danger" />
            <MetricTile label="Checks" value={checks.length} tone="neutral" />
          </div>
        </div>

        {aiInsights && (
          <div className="surface report-card command-quick-card">
            <SectionHeader
              icon={<Zap className="h-4 w-4" />}
              title="Quick Win"
              text="Highest-impact fix to make first."
            />
            <p>{aiInsights.quickWin}</p>
          </div>
        )}

        <div className="surface report-card command-priority-card">
          <div className="command-card-label">Priority Queue</div>
          <div className="priority-stack">
            {priorityChecks.map((check, index) => (
              <div key={check.id} className={`priority-compact priority-${check.status}`}>
                <div>
                  <em>{index + 1}</em>
                  {statusIcons[check.status]}
                  <span>{check.label}</span>
                </div>
                <strong>{check.weight}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      {aiInsights && (
        <section className="insight-grid">
          <div className="surface report-card insight-recommendations">
            <SectionHeader
              icon={<Lightbulb className="h-4 w-4" />}
              title="AI Recommendations"
              text="Prioritized suggestions generated from the scanned page."
            />
            <div className="recommendation-grid">
              {aiInsights.recommendations.slice(0, 5).map((rec, i) => (
                <div key={rec} className="recommendation-item">
                  <span>{i + 1}</span>
                  <div>
                    <strong>{i === 0 ? "Start here" : `Step ${i + 1}`}</strong>
                    <p>{rec}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {aiInsights.contentGap && (
            <div className="surface report-card insight-gap">
              <SectionHeader
                icon={<AlertCircle className="h-4 w-4" />}
                title="Content Gap"
                text="The missing context most likely to limit AI visibility."
              />
              <div className="content-gap-callout">
                <span>Missing angle</span>
                <p>{aiInsights.contentGap}</p>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="surface report-card">
        <SectionHeader
          icon={<Info className="h-4 w-4" />}
          title="AI Visibility Map"
          text="The core signals an answer engine needs to understand and cite the page."
        />
        <div className="entity-map">
          {entityNodes.map((node) => (
            <div key={node} className="entity-node">{node}</div>
          ))}
        </div>
      </section>

      <div className="report-grid">
        <main className="report-main">
          <section className="surface report-card audit-overview-card">
            <SectionHeader
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Audit Overview"
              text="The full technical scoring layer behind the readiness score."
            />
            <div className="status-lane-grid">
              <StatusLane title="Critical Issues" checks={failChecks} />
              <StatusLane title="Warnings" checks={warnChecks} />
              <StatusLane title="Passing Signals" checks={passChecks} />
            </div>
          </section>

          <section className="surface report-card">
            <SectionHeader
              icon={<Info className="h-4 w-4" />}
              title="Detailed Audit Breakdown"
              text="Tap a card only when you need the next action."
            />
            <div className="audit-detail-grid">
              {checks.map((check) => (
                <AuditCheckCard
                  key={check.id}
                  check={check}
                  expanded={expandedCheck === check.id}
                  onToggle={() => setExpandedCheck(expandedCheck === check.id ? null : check.id)}
                />
              ))}
            </div>
          </section>
        </main>
      </div>

      <section className="surface pro-card pro-report-live">
        <div className="pro-report-header">
          <SectionHeader
            icon={<Crown className="h-4 w-4" />}
            title="Pro Report Preview"
            text="A launch-ready implementation plan built from this scan."
          />
          <button onClick={handleCopy} className="btn btn-secondary">Copy expanded report</button>
        </div>

        <div className="pro-executive-panel">
          <div>
            <span>Highest leverage move</span>
            <h3>{roadmap[0]?.label ?? "Strengthen AI visibility signals"}</h3>
            <p>{roadmap[0] ? getAction(roadmap[0]) : "Improve page clarity, structured data, proof, and FAQ coverage."}</p>
          </div>
          <div className="pro-impact-metrics">
            <div><strong>{roadmap.length}</strong><span>Fixes</span></div>
            <div><strong>{schemaChecklist.filter((item) => !item.done).length}</strong><span>Schema tasks</span></div>
            <div><strong>10</strong><span>FAQs</span></div>
          </div>
        </div>

        <div className="pro-report-layout">
          <div className="pro-primary-column">
            <ProBlock title="Priority fix roadmap">
              {roadmap.map((check, index) => (
                <div className="pro-roadmap-row" key={check.id}>
                  <span>{index + 1}</span>
                  <div>
                    <div className="pro-roadmap-heading">
                      <strong>{check.label}</strong>
                      <em>{getEffort(check)}</em>
                    </div>
                    <p>{getAction(check)}</p>
                  </div>
                </div>
              ))}
            </ProBlock>

            <ProBlock title="Full AI search breakdown">
              <div className="pro-breakdown-grid">
                {aiBreakdown.map((item) => (
                  <div className="pro-breakdown-card" key={item.label}>
                    <div className="pro-breakdown-heading">
                      <strong>{item.label}</strong>
                      <span>{item.value}</span>
                    </div>
                    <p>{item.detail}</p>
                  </div>
                ))}
              </div>
            </ProBlock>
          </div>

          <div className="pro-secondary-column">
            <ProBlock title="Schema implementation checklist">
              {schemaChecklist.map((item) => (
                <div className="pro-check-row" key={item.title}>
                  {item.done ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Lock className="h-4 w-4 text-cyan-300" />}
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                  </div>
                </div>
              ))}
            </ProBlock>

            <ProBlock title="Competitor/entity comparison">
              <div className="competitor-input-panel">
                <textarea
                  value={competitorUrls}
                  onChange={(event) => setCompetitorUrls(event.target.value)}
                  placeholder={"https://competitor.com\nhttps://another.com"}
                  rows={3}
                />
                <button type="button" onClick={handleCompare} disabled={compareLoading} className="btn btn-secondary">
                  {compareLoading ? "Comparing" : "Compare URLs"}
                </button>
              </div>
              {compareError && <p className="competitor-error">{compareError}</p>}
              <div className="pro-competitor-table">
                {[
                  ["Overall score", currentMetrics.overall, "overall"],
                  ["Entity clarity", currentMetrics.entity, "entity"],
                  ["Schema coverage", currentMetrics.schema, "schema"],
                  ["Proof depth", currentMetrics.proof, "proof"],
                ].map(([signal, current, key]) => {
                  const values = competitors.map((item) => item.metrics[key as keyof CompetitorResult["metrics"]]);
                  const best = values.length ? Math.max(...values) : null;
                  const delta = best === null ? null : Number(current) - best;
                  return (
                    <div key={signal} className="pro-competitor-row">
                      <strong>{signal}</strong>
                      <span>{best === null ? "Add URLs" : (delta ?? 0) >= 0 ? `Ahead +${delta}` : `Behind ${delta}`}</span>
                      <p>
                        Your page: {current}/100
                        {best !== null ? ` · Best competitor: ${best}/100` : " · Enter competitor URLs to generate a benchmark."}
                      </p>
                    </div>
                  );
                })}
              </div>
              {competitors.length > 0 && (
                <div className="competitor-url-list">
                  {competitors.map((item) => (
                    <div key={item.url}>
                      <strong>{item.score}</strong>
                      <span>{item.url}</span>
                    </div>
                  ))}
                </div>
              )}
            </ProBlock>
          </div>
        </div>

        <ProBlock title="Recommended FAQ set">
          <div className="pro-faq-grid">
            {recommendedFaqs.map((faq, index) => (
              <p key={faq}><span>{index + 1}</span>{faq}</p>
            ))}
          </div>
        </ProBlock>
      </section>

      <div className="report-action-row flex flex-col justify-center gap-3 sm:flex-row">
        <button onClick={handleCopy} className="btn btn-secondary">
          {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy report"}
        </button>
        <button onClick={handleCopyShareLink} className="btn btn-secondary">
          {shareCopied ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
          {shareCopied ? "Link copied" : "Copy share link"}
        </button>
        <button onClick={onReset} className="btn btn-primary">
          <RotateCcw className="h-4 w-4" />
          Rescan or scan another URL
        </button>
      </div>

      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}

function MetricTile({ label, value, tone }: { label: string; value: number; tone: "success" | "warning" | "danger" | "neutral" }) {
  return (
    <div className={`metric-tile metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusLane({ title, checks }: { title: string; checks: CheckResult[] }) {
  return (
    <div className="status-lane">
      <div className="status-lane-header">
        <span>{title}</span>
        <strong>{checks.length}</strong>
      </div>
      <div className="status-lane-list">
        {checks.slice(0, 5).map((check) => (
          <div key={check.id}>
            {statusIcons[check.status]}
            <span>{check.label}</span>
          </div>
        ))}
        {checks.length === 0 && <p>No signals in this group.</p>}
      </div>
    </div>
  );
}

function AuditCheckCard({ check, expanded, onToggle }: { check: CheckResult; expanded: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className={`audit-card ${statusColors[check.status]}`}>
      <div className="audit-card-top">
        <div className="audit-card-title">
          {statusIcons[check.status]}
          <div>
            <span>{CHECK_GROUPS[check.id] ?? "Audit Signal"}</span>
            <strong>{check.label}</strong>
          </div>
        </div>
        <div className="audit-weight">
          <span>Weight</span>
          <strong>{check.weight}</strong>
        </div>
      </div>

      <div className="audit-card-body">
        <p>{check.detail}</p>
        <div className="audit-card-footer">
          <span className="audit-status-pill">{statusLabels[check.status]}</span>
          <small>{expanded ? "Action shown below" : "Tap for recommended action"}</small>
        </div>
      </div>

      {expanded && (
        <div className="audit-action">
          <span>Recommended action</span>
          <p>{getAction(check)}</p>
        </div>
      )}
    </button>
  );
}

function SectionHeader({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="icon-tile">{icon}</div>
      <div>
        <h3 className="section-heading">{title}</h3>
        <p className="section-kicker mt-1">{text}</p>
      </div>
    </div>
  );
}

function ProBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="pro-block">
      <h4>{title}</h4>
      <div>{children}</div>
    </div>
  );
}
