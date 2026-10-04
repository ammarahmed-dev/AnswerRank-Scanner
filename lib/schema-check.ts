import * as cheerio from "cheerio";

/**
 * JSON-LD inspection for the free schema checker: parses every ld+json block, lists the entity
 * types, and flags missing required/recommended properties for the types AI engines lean on.
 * Property lists follow schema.org and Google's structured data docs (simplified). Microdata and
 * RDFa are not read.
 */

type Json = Record<string, unknown>;

export type SchemaBlock = { index: number; valid: boolean; error?: string; types: string[] };
export type SchemaEntity = { type: string; missingRequired: string[]; missingRecommended: string[] };
export type SchemaCheckResult = {
  blocks: SchemaBlock[];
  entities: SchemaEntity[];
  types: string[];
  suggestions: string[];
};

type Spec = { required: string[]; recommended: string[] };

const SPECS: Record<string, Spec> = {
  Organization: { required: ["name", "url"], recommended: ["logo", "sameAs", "description"] },
  WebSite: { required: ["name", "url"], recommended: ["publisher"] },
  WebPage: { required: ["name"], recommended: ["description", "isPartOf"] },
  Article: { required: ["headline", "author", "datePublished"], recommended: ["dateModified", "image", "publisher"] },
  FAQPage: { required: ["mainEntity"], recommended: [] },
  Product: { required: ["name"], recommended: ["offers", "image", "description", "aggregateRating"] },
  SoftwareApplication: { required: ["name"], recommended: ["applicationCategory", "operatingSystem", "offers"] },
  LocalBusiness: { required: ["name", "address"], recommended: ["telephone", "openingHours", "url"] },
  BreadcrumbList: { required: ["itemListElement"], recommended: [] },
  Person: { required: ["name"], recommended: ["url", "sameAs", "jobTitle"] },
  HowTo: { required: ["name", "step"], recommended: ["description"] },
};

// Subtypes that follow their parent's property list.
const ALIASES: Record<string, string> = {
  BlogPosting: "Article",
  NewsArticle: "Article",
  TechArticle: "Article",
  OnlineBusiness: "Organization",
  Corporation: "Organization",
  ProfessionalService: "LocalBusiness",
  Restaurant: "LocalBusiness",
  Store: "LocalBusiness",
  WebApplication: "SoftwareApplication",
  MobileApplication: "SoftwareApplication",
};

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function typesOf(node: Json): string[] {
  const raw = node["@type"];
  const list = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];
  return list.filter((t): t is string => typeof t === "string").map((t) => t.replace(/^https?:\/\/schema\.org\//, ""));
}

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/** Top-level nodes of a parsed block: handles arrays and @graph. */
function flatten(parsed: unknown): Json[] {
  const nodes: Json[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!isObject(value)) return;
    if (Array.isArray(value["@graph"])) visit(value["@graph"]);
    if (value["@type"] !== undefined) nodes.push(value);
  };
  visit(parsed);
  return nodes;
}

function faqProblems(node: Json): string[] {
  const entities = Array.isArray(node.mainEntity) ? node.mainEntity : node.mainEntity ? [node.mainEntity] : [];
  const bad = entities.filter((q) => {
    if (!isObject(q)) return true;
    const answer = q.acceptedAnswer;
    return !hasValue(q.name) || !isObject(answer) || !hasValue(answer.text);
  });
  return bad.length ? [`${bad.length} question${bad.length === 1 ? "" : "s"} missing a name or an answer text`] : [];
}

export function checkSchema(html: string): SchemaCheckResult {
  const $ = cheerio.load(html);
  const blocks: SchemaBlock[] = [];
  const entities: SchemaEntity[] = [];
  // Identity entities declared inside another entity (e.g. BlogPosting.publisher) count for suggestions.
  const nestedTypes = new Set<string>();

  $('script[type="application/ld+json"]').each((i, el) => {
    const raw = $(el).contents().text().trim();
    try {
      const nodes = flatten(JSON.parse(raw));
      const types = nodes.flatMap(typesOf);
      blocks.push({ index: i + 1, valid: true, types });
      for (const node of nodes) {
        for (const key of ["publisher", "author", "provider", "creator"]) {
          const values = Array.isArray(node[key]) ? (node[key] as unknown[]) : [node[key]];
          for (const v of values) if (isObject(v)) typesOf(v).forEach((t) => nestedTypes.add(t));
        }
        for (const type of typesOf(node)) {
          const spec = SPECS[type] ?? SPECS[ALIASES[type] ?? ""];
          if (!spec) {
            entities.push({ type, missingRequired: [], missingRecommended: [] });
            continue;
          }
          const missingRequired = spec.required.filter((p) => !hasValue(node[p]));
          if (type === "FAQPage" && !missingRequired.length) missingRequired.push(...faqProblems(node));
          entities.push({ type, missingRequired, missingRecommended: spec.recommended.filter((p) => !hasValue(node[p])) });
        }
      }
    } catch (err) {
      blocks.push({ index: i + 1, valid: false, error: err instanceof SyntaxError ? err.message.slice(0, 160) : "Could not parse", types: [] });
    }
  });

  const types = [...new Set(entities.map((e) => e.type))];
  const has = (...names: string[]) => names.some((n) => types.includes(n) || nestedTypes.has(n));
  const suggestions: string[] = [];
  if (!blocks.length) suggestions.push("No JSON-LD structured data found. Add Organization and WebSite markup to the homepage and Article markup to posts.");
  if (blocks.some((b) => !b.valid)) suggestions.push("Fix the JSON-LD blocks that fail to parse. Invalid markup is ignored entirely.");
  if (blocks.length && !has("Organization", "LocalBusiness", "Person")) suggestions.push("Add Organization (or LocalBusiness / Person) markup so AI engines can identify who publishes the page.");
  if (blocks.length && !has("WebSite", "WebPage", "Article", "BlogPosting", "NewsArticle", "Product", "SoftwareApplication")) suggestions.push("Add markup that describes the page itself (WebPage, Article, Product or SoftwareApplication).");
  if (blocks.length && !has("FAQPage")) suggestions.push("If the page answers common questions, add FAQPage markup that matches the visible Q&A.");
  return { blocks, entities, types, suggestions };
}
