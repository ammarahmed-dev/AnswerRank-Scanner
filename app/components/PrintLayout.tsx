import { ScanResult } from "@/types/index";

interface Props {
  report: ScanResult;
}

type Category = "schema" | "metadata" | "content" | "performance" | "trust" | "ai-readiness" | "headings";

const CATEGORY_LABELS: Record<Category, string> = {
  schema: "Schema",
  metadata: "Metadata",
  content: "Content Clarity",
  performance: "Performance",
  trust: "Trust Signals",
  "ai-readiness": "AI Readiness",
  headings: "Headings",
};

const FIX_MAP: Record<string, { why: string; fix: string }> = {
  title: {
    why: "AI engines use the page title as the primary label when citing your page. A missing or oversized title reduces citation accuracy and click-through rates from AI-generated results.",
    fix: "Write a descriptive title between 30-60 characters that leads with your primary keyword and includes your brand name. Avoid keyword stuffing or vague labels.",
  },
  meta_desc: {
    why: "AI assistants often pull the meta description when summarizing a page in answer results. A missing or truncated description forces AI to infer context.",
    fix: "Write a 120-160 character meta description that clearly states the page value proposition. Use active voice and include the target keyword naturally.",
  },
  h1: {
    why: "The H1 is the most semantically important heading on the page. AI systems rely on it to identify the primary topic.",
    fix: "Add exactly one H1 per page that clearly states the page topic.",
  },
  heading_structure: {
    why: "A clear H1-H2-H3 hierarchy helps AI parse your content into clear sections.",
    fix: "Ensure H2 headings exist before using H3s. Structure headings like a document outline.",
  },
  schema_present: {
    why: "Structured data is a machine-readable signal that helps AI engines understand your page type and entities.",
    fix: "Add Organization and WebSite JSON-LD on core pages, then validate with schema validators.",
  },
  faq_schema: {
    why: "FAQPage schema gives AI systems a clear Q&A structure for answer extraction.",
    fix: "Add real FAQ content and mark it up using FAQPage JSON-LD.",
  },
  article_schema: {
    why: "Article or BlogPosting schema helps AI classify informational content correctly.",
    fix: "Add content-specific schema and include author, publish date, and headline.",
  },
  og_tags: {
    why: "Open Graph tags improve page interpretation across previews and shared contexts.",
    fix: "Add og:title, og:description, og:image, and og:url on each page.",
  },
  og_image: {
    why: "A clear OG image provides useful context in link and citation previews.",
    fix: "Add a 1200x630 OG image URL that is absolute and publicly accessible.",
  },
  https: {
    why: "HTTPS is a baseline trust signal for users, crawlers, and indexing systems.",
    fix: "Ensure valid SSL is configured and all canonical/internal links use https:// URLs.",
  },
  robots: {
    why: "robots.txt controls crawl access and helps avoid indexing low-value areas.",
    fix: "Create a robots.txt at domain root with clear allow/disallow rules.",
  },
  sitemap: {
    why: "An XML sitemap helps crawlers discover and prioritize important pages.",
    fix: "Publish /sitemap.xml and keep it updated when content changes.",
  },
  alt_text: {
    why: "Alt text helps AI systems understand image meaning and page context.",
    fix: "Add descriptive alt text for meaningful images and empty alt for decorative images.",
  },
  word_count: {
    why: "Thin pages provide weak answer context for AI and search systems.",
    fix: "Expand content to fully answer the user intent with clear supporting context.",
  },
  internal_links: {
    why: "Internal links help crawlers map topical relationships across your site.",
    fix: "Add contextual internal links to related pages using descriptive anchor text.",
  },
  structured_density: {
    why: "Multiple relevant schema blocks can improve entity and content understanding.",
    fix: "Layer Organization/WebSite with content-specific schema where appropriate.",
  },
};

function grade(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Needs Work";
  return "Poor";
}

function gradeClass(score: number) {
  if (score >= 85) return "pl-grade-excellent";
  if (score >= 70) return "pl-grade-strong";
  if (score >= 50) return "pl-grade-medium";
  return "pl-grade-poor";
}

function mapCategory(id: string): Category {
  if (["schema_present", "faq_schema", "article_schema", "structured_density"].includes(id)) return "schema";
  if (["title", "meta_desc", "og_tags", "og_image"].includes(id)) return "metadata";
  if (["h1", "heading_structure"].includes(id)) return "headings";
  if (["word_count", "alt_text", "internal_links"].includes(id)) return "content";
  if (["https", "robots", "sitemap"].includes(id)) return "trust";
  return "ai-readiness";
}

function categoryScores(checks: ScanResult["checks"]) {
  const groups: Record<Category, number[]> = {
    schema: [], metadata: [], content: [], performance: [],
    trust: [], "ai-readiness": [], headings: [],
  };
  checks.forEach((c) => {
    const cat = mapCategory(c.id);
    const val = c.status === "pass" ? 100 : c.status === "warn" ? 60 : 25;
    groups[cat].push(val);
  });
  return (Object.entries(groups) as [Category, number[]][])
    .filter(([, vals]) => vals.length > 0)
    .map(([cat, vals]) => ({
      category: cat,
      label: CATEGORY_LABELS[cat],
      score: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    }));
}

function metadataFallbackTitle(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getAiSummary(report: ScanResult) {
  if (report.aiInsights?.summary) return report.aiInsights.summary;
  const title = report.metadata?.title?.trim() || metadataFallbackTitle(report.url);
  return `This page appears to be about ${title}. The available metadata gives partial context, but the page may need clearer positioning for AI systems to summarize it confidently.`;
}

function getConfidence(score: number) {
  if (score >= 80) {
    return {
      label: "High confidence",
      detail: "The page gives AI systems enough clear signals to understand the core topic.",
    };
  }
  if (score >= 60) {
    return {
      label: "Medium confidence",
      detail: "The page has useful signals, but some context or structure is missing.",
    };
  }
  return {
    label: "Low confidence",
    detail: "The page needs clearer metadata, schema, and answer-ready content.",
  };
}

function getMissingContext(report: ScanResult) {
  if (report.aiInsights?.contentGap?.trim()) return report.aiInsights.contentGap;
  const signals = new Set<string>();
  report.checks
    .filter((check) => check.status !== "pass")
    .forEach((check) => {
      const category = mapCategory(check.id);
      if (category === "schema") signals.add("Structured data");
      if (category === "metadata") signals.add("Clear page positioning");
      if (category === "headings") signals.add("Heading structure");
      if (category === "content") signals.add("Use cases and audience clarity");
      if (category === "trust") signals.add("Proof and trust signals");
    });
  if (!signals.size) return "No major missing context detected.";
  return Array.from(signals).join(", ");
}

function getNextBestImprovement(report: ScanResult) {
  if (report.aiInsights?.quickWin?.trim()) return report.aiInsights.quickWin;
  const topIssue = report.checks.find((check) => check.status !== "pass");
  return topIssue?.detail || "Address the top-priority issue from this audit to improve AI visibility.";
}

function PageHeader({ url, date }: { url: string; date: string }) {
  return (
    <div className="pl-page-header">
      <span className="pl-page-brand">AEOCheck</span>
      <span className="pl-page-url">{url}</span>
      <span className="pl-page-date">{date}</span>
    </div>
  );
}

function MetaRow({ label, value, charLimit, isUrl }: { label: string; value?: string; charLimit?: number; isUrl?: boolean }) {
  const normalized = value?.trim() ?? "";
  const missing = !normalized;
  const over = Boolean(charLimit && normalized.length > charLimit);

  return (
    <div className="pl-meta-row">
      <span className="pl-meta-label">{label}</span>
      <span className={`pl-meta-value${missing ? " is-missing" : ""}${over ? " is-over" : ""}`}>
        {missing ? "Not set" : normalized}
      </span>
      <span className={`pl-meta-count${over ? " is-over" : ""}`}>
        {!missing && charLimit ? `${normalized.length}/${charLimit}` : isUrl && !missing ? "URL" : ""}
      </span>
    </div>
  );
}

export default function PrintLayout({ report }: Props) {
  const date = new Date(report.scannedAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const scores = categoryScores(report.checks);
  const issues = report.checks.filter((c) => c.status !== "pass");
  const criticals = issues.filter((c) => c.status === "fail");
  const warnings = issues.filter((c) => c.status === "warn");
  const passing = report.checks.length - issues.length;
  const highPriority = criticals.length;
  const mediumPriority = warnings.length;

  const aiSummary = getAiSummary(report);
  const confidence = getConfidence(report.score);
  const missingContext = getMissingContext(report);
  const nextBestImprovement = getNextBestImprovement(report);

  const competitors = (report.competitors ?? []).filter((row) => !row.error && typeof row.score === "number");
  const competitor = competitors[0] ?? null;
  const competitorGap = competitor && typeof competitor.score === "number" ? report.score - competitor.score : null;

  return (
    <div className="print-layout">
      <div className="pl-cover">
        <div className="pl-cover-brand">
          <span className="pl-cover-logo">✦</span>
          <span>AEOCheck</span>
        </div>
        <h1 className="pl-cover-title">AI Visibility Report</h1>
        <p className="pl-cover-url">{report.url}</p>
        <p className="pl-cover-date">Scanned {date}</p>
        <div className="pl-cover-score">
          <span className="pl-cover-score-num">{report.score}</span>
          <div className="pl-cover-score-meta">
            <span className="pl-cover-score-label">out of 100</span>
            <span className={`pl-grade ${gradeClass(report.score)}`}>{grade(report.score)}</span>
          </div>
        </div>
        <div className="pl-cover-stats">
          <div className="pl-cover-stat pl-stat-critical">
            <strong>{highPriority}</strong>
            <span>Critical fixes</span>
          </div>
          <div className="pl-cover-stat pl-stat-warning">
            <strong>{mediumPriority}</strong>
            <span>High impact</span>
          </div>
          <div className="pl-cover-stat pl-stat-pass">
            <strong>{passing}</strong>
            <span>Passing checks</span>
          </div>
        </div>
        <div className="pl-cover-summary">
          <p className="pl-cover-summary-title">Executive Summary</p>
          <div className="pl-exec-grid">
            <div className="pl-exec-card">
              <strong>Main diagnosis</strong>
              <p>{issues.find((c) => {
                const cat = mapCategory(c.id);
                return cat !== "performance" && c.id !== "pagespeed_low" && c.id !== "pagespeed_moderate";
              })?.detail ?? issues[0]?.detail ?? "Core visibility signals are in good shape."}</p>
            </div>
            <div className="pl-exec-card">
              <strong>Top opportunity</strong>
              <p>{FIX_MAP[issues.find((c) => {
                const cat = mapCategory(c.id);
                return cat !== "performance" && c.id !== "pagespeed_low" && c.id !== "pagespeed_moderate";
              })?.id ?? ""]?.fix ?? "Keep schema and answer blocks current as pages evolve."}</p>
            </div>
            <div className="pl-exec-card">
              <strong>Biggest issue</strong>
              <p>{issues.find((c) => {
                const cat = mapCategory(c.id);
                return cat !== "performance";
              })?.label ?? "No critical blockers detected."}</p>
            </div>
            <div className="pl-exec-card">
              <strong>Performance score</strong>
              <p>{report.pagespeed?.score !== undefined
                ? `${report.pagespeed.score}/100. Page speed affects how reliably AI crawlers index your content.`
                : "PageSpeed score unavailable for this scan."}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="pl-page pl-force-break">
        <PageHeader url={report.url} date={date} />
        <h2 className="pl-section-title">Score Breakdown</h2>
        <table className="pl-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((row) => (
              <tr key={row.category}>
                <td>{row.label}</td>
                <td>{row.score}/100</td>
                <td><span className={`pl-grade ${gradeClass(row.score)}`}>{grade(row.score)}</span></td>
              </tr>
            ))}
            {report.pagespeed?.score !== undefined && (
              <tr>
                <td>Page Speed</td>
                <td>{report.pagespeed.score}/100</td>
                <td><span className={`pl-grade ${gradeClass(report.pagespeed.score)}`}>{grade(report.pagespeed.score)}</span></td>
              </tr>
            )}
          </tbody>
        </table>

        <h2 className="pl-section-title">AI Answer Snapshot</h2>
        <div className="pl-ai-snapshot-grid">
          <div className="pl-ai-snapshot-card">
            <strong>If AI summarized this page</strong>
            <p>{aiSummary}</p>
          </div>
          <div className="pl-ai-snapshot-card">
            <strong>Confidence</strong>
            <p className="pl-confidence-pill">{confidence.label}</p>
            <p>{confidence.detail}</p>
          </div>
          <div className="pl-ai-snapshot-card">
            <strong>Missing context</strong>
            <p>{missingContext}</p>
          </div>
          <div className="pl-ai-snapshot-card">
            <strong>Next best improvement</strong>
            <p>{nextBestImprovement}</p>
          </div>
        </div>
      </div>

      {report.metadata && (
        <div className="pl-page pl-force-break">
          <PageHeader url={report.url} date={date} />
          <h2 className="pl-section-title">Metadata Overview</h2>
          <div className="pl-meta-grid">
            <MetaRow label="Title" value={report.metadata.title} charLimit={60} />
            <MetaRow label="Meta Description" value={report.metadata.metaDescription} charLimit={160} />
            <MetaRow label="H1" value={report.metadata.h1} />
            <MetaRow label="Canonical URL" value={report.metadata.canonical} isUrl />
            <MetaRow label="OG Title" value={report.metadata.ogTitle} charLimit={60} />
            <MetaRow label="OG Description" value={report.metadata.ogDescription} charLimit={155} />
            <MetaRow label="OG Image" value={report.metadata.ogImage} isUrl />
          </div>
        </div>
      )}

      {report.aiInsights?.schemaRecommendations && (
        <div className="pl-page pl-force-break">
          <PageHeader url={report.url} date={date} />
          <h2 className="pl-section-title">Schema Recommendations</h2>
          <div className="pl-schema-grid">
            <div className="pl-schema-card">
              <strong>Detected schema types</strong>
              <p>{report.aiInsights.schemaRecommendations.detected.length ? report.aiInsights.schemaRecommendations.detected.join(", ") : "No schema types detected."}</p>
            </div>
            <div className="pl-schema-card">
              <strong>Recommended schema types</strong>
              <p>
                {report.aiInsights.schemaRecommendations.missing.length > 0
                  ? report.aiInsights.schemaRecommendations.missing.join(", ")
                  : report.aiInsights.schemaRecommendations.priority || "No additional schema needed."}
              </p>
            </div>
            <div className="pl-schema-card">
              <strong>Why it matters</strong>
              <p>{report.aiInsights.schemaRecommendations.reasoning || "No reasoning provided."}</p>
            </div>
            <div className="pl-schema-card">
              <strong>How to implement</strong>
              <p>{report.aiInsights.schemaRecommendations.missing.length ? `Add: ${report.aiInsights.schemaRecommendations.missing.join(", ")}` : "Add the recommended schema in JSON-LD and validate before publishing."}</p>
            </div>
          </div>
          <p className="pl-disclaimer">Review schema before publishing.</p>
        </div>
      )}

      {competitors.length > 0 && (
        <div className="pl-page pl-force-break">
          <PageHeader url={report.url} date={date} />
          <h2 className="pl-section-title">Competitor Analysis</h2>
          <div className="pl-competitor-grid">
            <div className="pl-competitor-card">
              <strong>Your site</strong>
              <p>{report.url}</p>
              <span>{report.score}/100</span>
            </div>
            {competitors.map((comp) => {
              const gap = typeof comp.score === "number" ? report.score - comp.score : null;
              return (
                <div key={comp.url} className="pl-competitor-card">
                  <strong>Competitor</strong>
                  <p>{comp.url}</p>
                  <span>{comp.score}/100</span>
                  <small>
                    {gap === null
                      ? ""
                      : gap > 0
                        ? `You are ahead by ${gap} points`
                        : gap < 0
                          ? `Competitor ahead by ${Math.abs(gap)} points`
                          : "Scores are tied"}
                  </small>
                </div>
              );
            })}
          </div>
          <div className="pl-competitor-takeaway">
            <strong>Competitive takeaway</strong>
            <p>
              {competitorGap === null
                ? "Competitor comparison data is limited for this scan."
                : competitorGap > 0
                  ? `You are ahead by ${competitorGap} points on the primary competitor. Keep improving high-priority fixes to maintain your lead.`
                  : competitorGap < 0
                    ? `Primary competitor is ahead by ${Math.abs(competitorGap)} points. Start with critical fixes to close the gap.`
                    : "Scores are tied with primary competitor. Start with the highest-priority fixes to pull ahead."}
            </p>
          </div>
        </div>
      )}

      {issues.length > 0 && (() => {
        const criticalItems = criticals;
        const highItems = warnings;
        return (
          <div className="pl-page pl-force-break">
            <PageHeader url={report.url} date={date} />
            <h2 className="pl-section-title">Priority Action Plan</h2>
            <div className="pl-action-grid">
              <div className="pl-action-col pl-action-critical">
                <div className="pl-action-head">
                  <span>Critical</span>
                  <strong>{criticals.length}</strong>
                </div>
                <p className="pl-action-desc">Fix immediately to avoid visibility loss.</p>
                {criticalItems.length > 0 ? criticalItems.map((c) => (
                  <div key={c.id} className="pl-action-item">
                    <span>✦</span>
                    <div>
                      <p>{c.label}</p>
                      <small>{c.detail}</small>
                    </div>
                  </div>
                )) : <p className="pl-muted">No critical issues.</p>}
              </div>
              <div className="pl-action-col pl-action-high">
                <div className="pl-action-head">
                  <span>High Impact</span>
                  <strong>{warnings.length}</strong>
                </div>
                <p className="pl-action-desc">Strong lift with manageable effort.</p>
                {highItems.length > 0 ? highItems.map((c) => (
                  <div key={c.id} className="pl-action-item">
                    <span>✦</span>
                    <div>
                      <p>{c.label}</p>
                      <small>{c.detail}</small>
                    </div>
                  </div>
                )) : <p className="pl-muted">No high impact warnings.</p>}
              </div>
              <div className="pl-action-col pl-action-pass">
                <div className="pl-action-head">
                  <span>Passing</span>
                  <strong>{passing}</strong>
                </div>
                <p className="pl-action-desc">Signals already in good shape.</p>
                {report.checks
                  .filter((c) => c.status === "pass")
                  .map((c) => (
                    <div key={c.id} className="pl-action-item">
                      <span>✓</span>
                      <div>
                        <p>{c.label}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        );
      })()}

      {issues.length > 0 && (
        <div className="pl-page">
          <PageHeader url={report.url} date={date} />
          <h2 className="pl-section-title">
            Priority Issues <span className="pl-issue-count">({issues.length} items)</span>
          </h2>
          {issues.map((c) => {
            const meta = FIX_MAP[c.id];
            return (
              <div key={c.id} className="pl-issue-card">
                <div className="pl-issue-header">
                  <span className="pl-issue-title">{c.label}</span>
                  <span className="pl-issue-cat">{CATEGORY_LABELS[mapCategory(c.id)]}</span>
                  <span className={`pl-issue-badge ${c.status === "fail" ? "pl-badge-critical" : "pl-badge-warning"}`}>
                    {c.status === "fail" ? "Critical" : "Warning"}
                  </span>
                </div>
                <p className="pl-issue-detail">{c.detail}</p>
                {meta && (
                  <div className="pl-issue-blocks">
                    <div className="pl-issue-block pl-issue-why">
                      <strong>Why it matters</strong>
                      <p>{meta.why}</p>
                    </div>
                    <div className="pl-issue-block pl-issue-fix">
                      <strong>Recommended fix</strong>
                      <p>{meta.fix}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="pl-page pl-force-break pl-last-page">
        <PageHeader url={report.url} date={date} />
        {report.aiInsights && report.aiInsights.recommendations.length > 0 && (
          <>
            <h2 className="pl-section-title">AI Recommendations</h2>
            <ol className="pl-rec-list">
              {report.aiInsights.recommendations.map((rec, i) => (
                <li key={i} className="pl-rec-item">{rec}</li>
              ))}
            </ol>
          </>
        )}

        <h2 className="pl-section-title" style={{ marginTop: "16pt" }}>Report Notes</h2>
        <p className="pl-body">This audit is generated from publicly available page content and automated analysis. Review recommendations before publishing changes, especially schema, metadata, and content updates.</p>

        <h2 className="pl-section-title" style={{ marginTop: "16pt" }}>Next Steps</h2>
        <ol className="pl-rec-list">
          <li className="pl-rec-item"><strong>Fix critical issues first.</strong> Address Schema and Metadata failures first because they are usually the highest-impact and quickest to resolve.</li>
          <li className="pl-rec-item"><strong>Implement structured data updates.</strong> Add the recommended schema types and validate them before publishing.</li>
          <li className="pl-rec-item"><strong>Re-scan in 2-4 weeks.</strong> Measure score improvements and confirm that changes are reflected.</li>
          <li className="pl-rec-item"><strong>Expand to additional pages.</strong> Audit your homepage, pricing page, and key service pages individually.</li>
        </ol>
        <div className="pl-footer">
          AEOCheck - www.aeocheck.co - AI Visibility Report - Generated {date}
        </div>
      </div>
    </div>
  );
}


