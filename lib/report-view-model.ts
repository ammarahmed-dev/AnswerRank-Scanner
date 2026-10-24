import type { CheckResult, ScanResult } from "@/types/index";
import { mapReportCategory, type ReportCategory } from "@/lib/report-category-scores";
import { getNormalizedIssues } from "@/lib/report-issues";

export type Priority = "critical" | "high" | "medium" | "low";
export type Impact = "high" | "medium" | "low";
export type Effort = "easy" | "medium" | "hard";
export type Category = ReportCategory;

export type ReportIssue = {
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

export type SchemaRecommendation = {
  detected: string[];
  suggested: string[];
  missing: string[];
  reasons: string[];
};

export const CATEGORY_LABELS: Record<Category, string> = {
  schema: "Schema",
  metadata: "Metadata",
  content: "Content Clarity",
  performance: "Performance",
  trust: "Trust Signals",
  "ai-readiness": "AI Readiness",
  headings: "Headings",
};

export const schemaWhyItMatters: Record<string, string> = {
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

export function statusLabel(score: number) {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Needs Work";
  return "Poor";
}

export function categoryNote(category: Category, score: number) {
  if (category === "schema") return score >= 70 ? "Structured data coverage is solid." : "Schema types are missing. AI systems have less context to work with.";
  if (category === "metadata") return score >= 70 ? "Title, description, and OG tags are well-optimised." : "Tighten titles and descriptions so AI systems can accurately label this page.";
  if (category === "content") return score >= 70 ? "Content depth gives AI enough to work with." : "Add use-case detail and concise answer blocks so AI can extract clear responses.";
  if (category === "headings") return score >= 70 ? "Heading hierarchy is clear and well-structured." : "Restructure headings. A logical H1-H2-H3 hierarchy helps AI parse your content.";
  if (category === "trust") return score >= 70 ? "Trust signals and crawl directives look good." : "Add trust signals. Include HTTPS, a valid robots.txt, and author or brand information.";
  if (category === "performance") return score >= 70 ? "Mobile lab performance is good." : "Speed improvements are available. Faster pages are indexed more reliably by AI crawlers.";
  return score >= 70 ? "This page is well-structured for AI answer extraction." : "Improve content clarity so AI assistants can accurately summarize and cite this page.";
}

export const mapCategory = mapReportCategory;

export function effortById(id: string): Effort {
  if (id.includes("schema")) return "medium";
  if (id.startsWith("cwv_")) return "medium";
  if (id === "word_count" || id === "heading_structure") return "hard";
  return "easy";
}

export function impactByPriority(priority: Priority): Impact {
  if (priority === "critical" || priority === "high") return "high";
  if (priority === "medium") return "medium";
  return "low";
}

export function whyItMattersById(id: string): string {
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
    canonical: "A canonical URL tells AI engines and search crawlers which version of a page is authoritative. Without one, duplicate URLs (tracking parameters, www vs non-www) split signals and the wrong version may be cited.",
    qa_structure: "Answer engines look for sections that pose a question and answer it directly. Question-style H2/H3 headings make it easy for ChatGPT, Perplexity and AI Overviews to lift your answer verbatim and cite you.",
    readability: "AI engines like ChatGPT and Perplexity prefer content that is easy to parse and extract. Research shows readability (Flesch score) positively correlates with AI citation frequency - simpler, clearer writing gets cited more.",
    core_web_vitals: "Lighthouse lab metrics simulate a page load to identify slow rendering, layout shifts, and JavaScript blocking. They do not establish whether real-user Core Web Vitals pass or whether AI engines cite this page.",
    cwv_lcp: "Largest Contentful Paint affects how quickly the main content becomes available to users and crawlers. Slow LCP can cause visitors and bots to abandon the page before the content is fully usable.",
    cwv_cls: "Cumulative Layout Shift measures visual stability. High CLS makes the page feel unstable and can make content harder for users and crawlers to interpret reliably.",
    cwv_tbt: "Total Blocking Time shows how much JavaScript blocks the page from responding. High TBT can delay interaction and make crawled content slower to process.",
  };
  return map[id] ?? "Weak signals reduce how confidently AI assistants and search systems can understand and cite this page.";
}

export function recommendedFix(check: CheckResult) {
  if (check.id === "title") return "Rewrite the title to include the primary offer and audience in 30-60 characters.";
  if (check.id === "meta_desc") return "Add a clear 120-160 character meta description with problem, solution, and proof.";
  if (check.id === "h1") return "Use one H1 that states exactly what the page offers and who it is for.";
  if (check.id === "heading_structure") return "Restructure sections with H2 and H3 hierarchy to improve crawl and comprehension.";
  if (check.id === "schema_present") return "Add at least one JSON-LD block to your page head. Start with Organization and WebSite schema - these establish your brand entity for AI engines. Use schema.org or a generator like technicalseo.com/tools/schema-markup-generator/";
  if (check.id === "faq_schema") return "Wrap your Q&A content in FAQPage JSON-LD schema. Each question needs a Question and acceptedAnswer pair. Validate at validator.schema.org before publishing.";
  if (check.id === "article_schema") return "Add Article or BlogPosting JSON-LD to this page. Include headline, author, datePublished, and dateModified fields. This tells AI engines your content is authoritative and dated.";
  if (check.id === "structured_density") return "Layer additional schema types relevant to this page. If it has navigation, add BreadcrumbList. If it has a FAQ section, add FAQPage. If it represents your brand, add Organization and WebSite.";
  if (check.id.includes("schema")) return "Add JSON-LD schema relevant to this page type. Visit schema.org to find the right type for your content.";
  if (check.id === "https") return "Serve the page on HTTPS and redirect all HTTP requests.";
  if (check.id === "robots") return "Create a robots.txt at yourdomain.com/robots.txt. Make sure it does not block important pages. Validate it at search.google.com/search-console and ensure AI crawlers (GPTBot, ClaudeBot) are not blocked.";
  if (check.id === "ai_bot_access") return "Check your robots.txt and ensure GPTBot, ClaudeBot, and PerplexityBot are not blocked. Add explicit allow rules for AI crawlers.";
  if (check.id === "sitemap") return "Create a sitemap.xml listing all important pages and submit it in Google Search Console under Sitemaps. Most CMS platforms (Webflow, WordPress) generate this automatically - check your settings.";
  if (check.id === "llms_txt") return "Create a /llms.txt file at your domain root. Visit llmstxt.org for the standard format and generator tools.";
  if (check.id === "canonical") return "Add <link rel=\"canonical\" href=\"https://yourdomain.com/this-page\"> in the page head, pointing to the preferred URL of this page on your own domain.";
  if (check.id === "qa_structure") return "Add 2-3 H2/H3 headings phrased as the questions your buyers ask (for example \"How does X work?\"), each followed by a 40-60 word direct answer.";
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
  if (check.id === "cwv_lcp") return "Improve LCP by optimizing your largest image or text block - compress images, use modern formats (WebP), and preload key assets. Target LCP under 2.5 seconds.";
  if (check.id === "cwv_cls") return "Fix CLS by adding explicit width and height to images and embeds. Avoid inserting content above existing content. Target CLS under 0.1.";
  if (check.id === "cwv_tbt") return "Reduce TBT by deferring non-critical JavaScript, removing unused scripts, and breaking up long tasks. Target TBT under 200ms.";
  return `Review the ${check.label} signal and apply the recommended fix. Even small improvements to this signal can increase how confidently AI engines cite this page.`;
}

export function issueExample(check: CheckResult) {
  if (check.id === "title") return "Example: AI Visibility Audit for SaaS Teams | Brand Name";
  if (check.id === "meta_desc") return "Example: Scan your website and get an AI visibility report with prioritized fixes.";
  return undefined;
}

export function normalizeIssuesFromNormalized(issueRows: ReturnType<typeof getNormalizedIssues>): ReportIssue[] {
  return issueRows.map((issue) => {
    const category = mapCategory(issue.id);
    const priority = issue.priority;
    const checkLike: CheckResult = {
      id: issue.id,
      label: issue.label,
      detail: issue.detail,
      status: issue.status,
      weight: issue.weight,
    };

    return {
      id: issue.id,
      title: issue.label,
      priority,
      impact: impactByPriority(priority),
      effort: effortById(issue.id),
      category,
      problem: issue.detail,
      whyItMatters: whyItMattersById(issue.id),
      recommendedFix: recommendedFix(checkLike),
      example: issueExample(checkLike),
    };
  });
}

export function badgeTone(value: Priority | Impact | Effort) {
  if (value === "critical") return "badge-critical";
  if (value === "high") return "badge-high";
  if (value === "medium") return "badge-medium";
  if (value === "low") return "badge-low";
  if (value === "hard") return "badge-high";
  if (value === "easy") return "badge-low";
  return "badge-medium";
}

export function getSchemaRecommendation(report: ScanResult, issues: ReportIssue[], host: string): SchemaRecommendation {
  const checks = report.checks;
  const detectedTypes: string[] = Array.from(new Set((report.schemaTypes ?? []).filter(Boolean)));
  const detected = detectedTypes;

  const lowerSignals = `${report.url} ${report.metadata?.title ?? ""} ${report.metadata?.metaDescription ?? ""} ${issues.map((i) => i.problem).join(" ")}`.toLowerCase();
  const hasArticleSchemaWarning = checks.some((check) => check.id === "article_schema" && check.status === "warn");
  const hasFaqSchemaWarning = checks.some((check) => check.id === "faq_schema" && check.status === "warn");
  const suggested = ["Organization", "WebSite", "WebPage", "FAQPage"];
  if (hasArticleSchemaWarning || lowerSignals.includes("/blog/")) suggested.push("Article");
  if (hasArticleSchemaWarning && (lowerSignals.includes("how to") || lowerSignals.includes("step"))) suggested.push("HowTo");
  if (hasFaqSchemaWarning) suggested.push("FAQPage");
  if (lowerSignals.includes("service")) suggested.push("Service");
  if (lowerSignals.includes("software") || lowerSignals.includes("app") || host.includes("ai")) suggested.push("SoftwareApplication");
  if (lowerSignals.includes("pricing") || lowerSignals.includes("product")) suggested.push("Product");
  if (checks.some((c) => c.id === "internal_links" && c.status !== "pass")) suggested.push("BreadcrumbList");

  const uniqueSuggested = Array.from(new Set(suggested));
  const missing = uniqueSuggested.filter((type) => !detectedTypes.some((detectedType) => detectedType.toLowerCase() === type.toLowerCase()));

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

export function aboutContactSnapshotPhrase(detail: string) {
  if (/about and contact pages linked/i.test(detail)) return "About and Contact pages are linked.";
  if (/contact page found.*no.*about page linked/i.test(detail)) return "Contact page found, but no dedicated About page linked.";
  if (/about page found.*no.*contact page linked/i.test(detail)) return "About page found, but no dedicated Contact page linked.";
  if (/no (dedicated )?about or contact page linked/i.test(detail)) return "No clearly linked About or Contact page found.";
  if (/no clearly linked about or contact page found/i.test(detail)) return "No clearly linked About or Contact page found.";
  return detail;
}

export function contradictsAboutContact(text: string, detail: string) {
  if (!text.trim()) return false;
  const lower = text.toLowerCase();
  const saysContactMissing = /(no|missing|without|lack|lacks|absent).{0,35}contact|contact.{0,35}(missing|not found|absent|lacking)/i.test(lower);
  const saysAboutMissing = /(no|missing|without|lack|lacks|absent).{0,35}about|about.{0,35}(missing|not found|absent|lacking)/i.test(lower);
  const contactFound = /contact page found/i.test(detail) || /about and contact pages linked/i.test(detail);
  const aboutFound = /about page found/i.test(detail) || /about and contact pages linked/i.test(detail);
  if (contactFound && saysContactMissing) return true;
  if (aboutFound && saysAboutMissing) return true;
  return false;
}
