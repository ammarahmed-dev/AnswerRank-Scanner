import * as cheerio from "cheerio";
import { parseHtmlToScrapedData } from "@/lib/scrape";
import { runDeterministicChecks } from "@/lib/score-engine";

/**
 * Meta tag report for the free meta tag checker. Title, description, canonical and Open Graph are
 * graded by the scanner's own checks so the tool and the report always agree; the extra checks
 * (robots meta, viewport, language, Twitter card) are specific to this tool.
 */

export type MetaValues = {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  /** All Googlebot HTML meta values; optional for older client fixtures/responses. */
  googlebotRobots?: string;
  lang: string;
  viewport: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogUrl: string;
  ogType: string;
  twitterCard: string;
  twitterImage: string;
};

export type MetaCheck = { id: string; label: string; status: "pass" | "warn" | "fail"; detail: string };
export type MetaReport = { values: MetaValues; checks: MetaCheck[] };

const SCANNER_CHECKS = ["title", "meta_desc", "canonical", "og_tags", "og_image"];

export function extractMeta(html: string): MetaValues {
  const $ = cheerio.load(html);
  const meta = (selector: string) => ($(selector).first().attr("content") ?? "").trim();
  const allMeta = (name: string) => $(`meta[name="${name}" i]`).toArray()
    .map((node) => ($(node).attr("content") ?? "").trim()).filter(Boolean).join(", ");
  const og = (name: string) => meta(`meta[property="og:${name}" i], meta[name="og:${name}" i]`);
  return {
    title: $("title").first().text().replace(/\s+/g, " ").trim(),
    description: meta('meta[name="description" i]'),
    canonical: ($('link[rel="canonical" i]').first().attr("href") ?? "").trim(),
    robots: allMeta("robots"),
    googlebotRobots: allMeta("googlebot"),
    lang: ($("html").attr("lang") ?? "").trim(),
    viewport: meta('meta[name="viewport" i]'),
    ogTitle: og("title"),
    ogDescription: og("description"),
    ogImage: og("image"),
    ogUrl: og("url"),
    ogType: og("type"),
    twitterCard: meta('meta[name="twitter:card" i]'),
    twitterImage: meta('meta[name="twitter:image" i]'),
  };
}

export function buildMetaReport(html: string, url: string): MetaReport {
  const values = extractMeta(html);
  const scanner = runDeterministicChecks(parseHtmlToScrapedData(html, url)).filter((c) => SCANNER_CHECKS.includes(c.id));
  const checks: MetaCheck[] = scanner.map((c) => ({ id: c.id, label: c.label, status: c.status, detail: c.detail }));

  // Combine repeated tags; an earlier index/all cannot override a later restriction.
  // Ignore `none` used as a directive argument, e.g. max-image-preview: none.
  const blocksIndexing = (value: string) => value.split(",").some((rule) => {
    const tokens = rule.trim().split(/\s+/);
    return tokens.some((token, i) => /^(?:noindex|none)$/i.test(token) && !tokens[i - 1]?.endsWith(":"));
  });
  const genericNoindex = blocksIndexing(values.robots);
  const googlebotNoindex = blocksIndexing(values.googlebotRobots ?? "");
  const evidence = [values.robots && `robots="${values.robots}"`, values.googlebotRobots && `googlebot="${values.googlebotRobots}"`].filter(Boolean).join("; ");
  checks.push({
    id: "robots_meta", label: "Robots meta tags (generic / Googlebot)",
    status: genericNoindex || googlebotNoindex ? "fail" : "pass",
    detail: genericNoindex
      ? `An inspected generic robots meta tag contains noindex or none. This requests exclusion from search indexing when crawlers can read it. ${evidence}`
      : googlebotNoindex
        ? `An inspected Googlebot meta tag contains noindex or none. This requests exclusion from Google Search indexing; it does not establish other engines' behavior. ${evidence}`
        : `No noindex or none directive detected in the inspected generic/Googlebot HTML meta tags.${evidence ? ` ${evidence}` : " No matching nonempty meta values found."} This is not confirmation that the page can be indexed.`,
  });
  checks.push(
    values.viewport
      ? { id: "viewport", label: "Viewport", status: "pass", detail: "Viewport meta tag is set for mobile devices." }
      : { id: "viewport", label: "Viewport", status: "warn", detail: 'No viewport meta tag. Add <meta name="viewport" content="width=device-width, initial-scale=1">.' }
  );
  checks.push(
    values.lang
      ? { id: "lang", label: "Language", status: "pass", detail: `The page declares lang="${values.lang}".` }
      : { id: "lang", label: "Language", status: "warn", detail: 'The <html> element has no lang attribute. Declare the page language, for example lang="en".' }
  );
  checks.push(
    values.twitterCard
      ? { id: "twitter_card", label: "Twitter / X card", status: "pass", detail: `twitter:card is "${values.twitterCard}".` }
      : { id: "twitter_card", label: "Twitter / X card", status: "warn", detail: 'No twitter:card tag. Add <meta name="twitter:card" content="summary_large_image"> for rich link previews on X.' }
  );
  if (values.ogUrl && values.canonical && values.ogUrl.replace(/\/$/, "") !== values.canonical.replace(/\/$/, "")) {
    checks.push({ id: "og_url_match", label: "og:url matches canonical", status: "warn", detail: `og:url (${values.ogUrl}) differs from the canonical URL (${values.canonical}). Keep them identical.` });
  }
  return { values, checks };
}
