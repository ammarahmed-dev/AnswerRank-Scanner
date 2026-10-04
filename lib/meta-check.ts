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
  const og = (name: string) => meta(`meta[property="og:${name}" i], meta[name="og:${name}" i]`);
  return {
    title: $("title").first().text().replace(/\s+/g, " ").trim(),
    description: meta('meta[name="description" i]'),
    canonical: ($('link[rel="canonical" i]').first().attr("href") ?? "").trim(),
    robots: meta('meta[name="robots" i]'),
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

  const noindex = /(^|[\s,])(noindex|none)([\s,]|$)/i.test(values.robots);
  checks.push(
    noindex
      ? { id: "robots_meta", label: "Robots meta tag", status: "fail", detail: `The page is marked "${values.robots}", so search and AI engines are told not to index it.` }
      : { id: "robots_meta", label: "Robots meta tag", status: "pass", detail: values.robots ? `Robots meta is "${values.robots}", which allows indexing.` : "No robots meta tag, so the page can be indexed." }
  );
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
