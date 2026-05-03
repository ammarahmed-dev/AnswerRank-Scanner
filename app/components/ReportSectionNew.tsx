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
import { ReactNode, useMemo, useState } from "react";

interface Props {
  report: ScanResult;
  onReset: () => void;
}

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

export default function ReportSectionNew({ report, onReset }: Props) {
  const { url, score, checks, aiInsights, pagespeed, scannedAt } = report;
  const [notice, setNotice] = useState("");
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);

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
  const reportIdLabel = report.reportId ? report.reportId.slice(0, 8) : "Live scan";

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

      <section className="surface pro-card">
        <div className="pro-card-grid">
          <div>
            <SectionHeader
              icon={<Crown className="h-4 w-4" />}
              title="Pro Report locked"
              text="Upgrade-ready packaging for the deeper commercial report."
            />
            <div className="pro-feature-grid">
              {[
                "Full AI search breakdown",
                "Competitor/entity comparison",
                "Schema implementation checklist",
                "10 recommended FAQs",
                "Exportable PDF report",
                "Priority fix roadmap",
              ].map((item) => (
                <div key={item} className="pro-feature">
                  <Lock className="h-3.5 w-3.5 flex-shrink-0 text-cyan-300" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="pro-cta-panel">
            <span className="badge">Pro Report</span>
            <strong>$9</strong>
            <p>Unlock the full implementation plan when checkout is connected.</p>
            <button onClick={() => setNotice("Stripe checkout will be connected in the next step.")} className="btn btn-primary">
              Unlock Full Report - $9
            </button>
            <p className="muted-copy text-center">One-time report purchase. No subscription yet.</p>
          </div>
        </div>
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
