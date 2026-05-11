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
    why: "AI assistants often pull the meta description verbatim when summarizing a page in answer results. A missing or truncated description forces AI to guess, and guess badly.",
    fix: "Write a 120-160 character meta description that clearly states the page's value proposition. Use active voice, include the target keyword naturally, and end with a call to action.",
  },
  h1: {
    why: "The H1 is the most semantically important heading on the page. AI systems rely on it to identify the primary topic and match the page to user queries with precision.",
    fix: "Add exactly one H1 per page that clearly states the page topic. Do not use H1 for decorative text or brand slogans. Reserve it for the core topic statement.",
  },
  heading_structure: {
    why: "A clear H1-H2-H3 hierarchy lets AI parse your content into discrete topics. Broken hierarchy, such as H3 before H2, creates ambiguity in how sections are understood.",
    fix: "Ensure H2 headings exist before using H3s. Structure headings like a document outline: H2 for major topics, H3 for sub-points within each major topic.",
  },
  schema_present: {
    why: "JSON-LD structured data is a direct machine-readable signal that helps AI engines understand your page type, entity, and content relationships. Pages without schema are harder to cite and rank in AI results.",
    fix: "Add at minimum an Organization and WebSite JSON-LD block to every page. Validate your schema at schema.org/validator and cross-check with Google's Rich Results Test.",
  },
  faq_schema: {
    why: "FAQPage schema is one of the highest-impact schema types for AI answer engines. It gives AI a ready-made Q&A format to extract and cite directly, dramatically improving answer-engine visibility.",
    fix: "Add a FAQ section to your page covering at least 5 questions your customers actually ask, then mark it up with FAQPage JSON-LD schema with Question and Answer items.",
  },
  article_schema: {
    why: "Article, HowTo, and BlogPosting schema help AI categorize your content type and extract structured knowledge. Without it, AI may misclassify your content or skip it for informational queries.",
    fix: "Add Article or HowTo JSON-LD schema depending on your content type. Include datePublished, dateModified, author (with @type: Person), and a descriptive headline field.",
  },
  og_tags: {
    why: "Open Graph tags control how your page appears when shared on social platforms and in AI-generated link previews. Missing tags produce generic or incorrect summaries that reduce trust.",
    fix: "Add og:title, og:description, og:image, and og:url tags to every page. Keep og:title under 60 characters and og:description under 155 characters for full display.",
  },
  og_image: {
    why: "An og:image tag provides visual context when your page is shared or cited. AI-powered discovery tools often display this image alongside citations, improving recognition.",
    fix: "Add an og:image tag pointing to a 1200×630px image that represents your page content. Ensure the URL is absolute (includes https://) and publicly accessible without login.",
  },
  https: {
    why: "HTTPS is a baseline trust signal. AI engines and search systems deprioritize non-secure pages, and modern browsers show security warnings that reduce user confidence before they even read your content.",
    fix: "Migrate your site to HTTPS using a valid SSL certificate. Most hosting platforms (Cloudflare, Netlify, Vercel) provide free SSL. Ensure all internal links and canonical URLs use https://.",
  },
  robots: {
    why: "A robots.txt file controls which parts of your site can be crawled by bots and AI indexers. Without one, crawlers may index pages you would prefer to exclude, or block pages you want indexed.",
    fix: "Create a robots.txt file at your domain root (yourdomain.com/robots.txt). Allow all for public content pages, and use Disallow to block admin, staging, or thin-content URLs.",
  },
  sitemap: {
    why: "An XML sitemap helps AI crawlers discover and prioritize your content. Sites without sitemaps may have key pages missed during indexing, reducing overall AI visibility.",
    fix: "Generate an XML sitemap at /sitemap.xml and submit it to Google Search Console. Include all canonical URLs, set <changefreq> and <priority> values, and update it automatically when content changes.",
  },
  alt_text: {
    why: "AI systems cannot interpret images visually. Alt text is how they understand what an image depicts. Missing alt text means your images contribute zero semantic context to AI indexing.",
    fix: "Add descriptive alt text to every meaningful image using 5-15 words that describe the image content. Leave alt empty (alt='') for purely decorative images. Do not skip the attribute.",
  },
  word_count: {
    why: "Pages with under 300 words are treated as thin content by AI systems. Low word count signals that a page may not fully answer the query it targets, reducing its citation probability.",
    fix: "Expand your content to at least 300-500 words. Focus on fully answering the primary question your page targets, covering related subtopics and common follow-up questions your audience has.",
  },
  internal_links: {
    why: "Internal links help AI crawlers discover related content and understand your site's topical structure. Isolated pages with no internal links are harder to index and carry less authority.",
    fix: "Add at least 3-5 contextual internal links per page pointing to related content on your site. Use descriptive anchor text that reflects the linked page's primary topic.",
  },
  structured_density: {
    why: "Multiple schema blocks signal a rich, well-organized page. A single block provides basic context; layered schema types allow AI to extract richer entity relationships and improve answer quality.",
    fix: "Layer multiple schema types: start with Organization/WebSite, add content-specific types (Article, FAQPage, Product), and use BreadcrumbList for navigation context to build a complete entity picture.",
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

function PageHeader({ url, date }: { url: string; date: string }) {
  return (
    <div className="pl-page-header">
      <span className="pl-page-brand">AnswerRank Scanner</span>
      <span className="pl-page-url">{url}</span>
      <span className="pl-page-date">{date}</span>
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

  return (
    <div className="print-layout">

      {/* ── Page 1: Cover ── */}
      <div className="pl-cover">
        <div className="pl-cover-brand">
          <span className="pl-cover-logo">AR</span>
          <span>AnswerRank Scanner</span>
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
            <strong>{criticals.length}</strong>
            <span>Critical issues</span>
          </div>
          <div className="pl-cover-stat pl-stat-warning">
            <strong>{warnings.length}</strong>
            <span>Warnings</span>
          </div>
          <div className="pl-cover-stat pl-stat-pass">
            <strong>{passing}</strong>
            <span>Passing checks</span>
          </div>
        </div>
      </div>

      {/* ── Page 2: Score Breakdown + AI Summary ── */}
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

        {report.aiInsights && (
          <div className="pl-ai-summary">
            <h2 className="pl-section-title">AI Analysis Summary</h2>
            <p className="pl-body">{report.aiInsights.summary}</p>
            {report.aiInsights.quickWin && (
              <div className="pl-quick-win">
                <strong>Quick Win</strong>
                <p>{report.aiInsights.quickWin}</p>
              </div>
            )}
            {report.aiInsights.contentGap && (
              <div className="pl-quick-win pl-content-gap">
                <strong>Content Gap</strong>
                <p>{report.aiInsights.contentGap}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Pages 3+: Issue Breakdown (flows naturally, no forced break) ── */}
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

      {/* ── Last Page: AI Recommendations + Next Steps ── */}
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
        <h2 className="pl-section-title" style={{ marginTop: "16pt" }}>Next Steps</h2>
        <ol className="pl-rec-list">
          <li className="pl-rec-item"><strong>Fix critical issues first.</strong> Address any Schema and Metadata failures. They carry the highest weight in AI visibility scoring and are typically quick to implement.</li>
          <li className="pl-rec-item"><strong>Add FAQ schema for a quick win.</strong> FAQPage JSON-LD is one of the highest-impact additions for answer-engine visibility and can often be added in under an hour.</li>
          <li className="pl-rec-item"><strong>Re-scan in 2-4 weeks.</strong> After implementing fixes, run a fresh scan to measure score improvement and confirm changes are being picked up correctly.</li>
          <li className="pl-rec-item"><strong>Expand to other key pages.</strong> Run this audit on your pricing page, homepage, and top blog posts. Each page needs its own AI visibility optimisation.</li>
        </ol>
        <div className="pl-cta-box">
          <strong>Want help implementing these fixes?</strong>
          <p>Visit <span className="pl-cta-link">answerrank.com</span> to re-scan after changes, explore Pro reports with full schema recommendations, or share this PDF with your development team.</p>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="pl-footer">
        AnswerRank Scanner · answerrank.com · AI Visibility Report · Generated {date}
      </div>

    </div>
  );
}
