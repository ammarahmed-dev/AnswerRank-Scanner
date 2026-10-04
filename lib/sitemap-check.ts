import * as cheerio from "cheerio";

/**
 * Sitemap parsing and analysis for the free sitemap checker. Pure functions: the API route does the
 * fetching. Limits follow the sitemaps.org protocol (50,000 URLs and 50 MB per file).
 */

export const MAX_URLS_PER_SITEMAP = 50_000;

export type SitemapEntry = { loc: string; lastmod?: string };
export type ParsedSitemap =
  | { kind: "urlset"; entries: SitemapEntry[] }
  | { kind: "index"; children: string[] }
  | { kind: "invalid"; reason: string };

export function parseSitemap(xml: string): ParsedSitemap {
  const text = xml.replace(/^﻿/, "").trim();
  if (!text) return { kind: "invalid", reason: "The file is empty." };
  if (/<html[\s>]/i.test(text.slice(0, 500))) return { kind: "invalid", reason: "This is an HTML page, not an XML sitemap." };
  const $ = cheerio.load(text, { xmlMode: true });
  if ($("sitemapindex").length) {
    const children = $("sitemapindex > sitemap > loc").toArray().map((el) => $(el).text().trim()).filter(Boolean);
    return { kind: "index", children };
  }
  if ($("urlset").length) {
    const entries = $("urlset > url").toArray().map((el) => {
      const loc = $(el).children("loc").first().text().trim();
      const lastmod = $(el).children("lastmod").first().text().trim();
      return lastmod ? { loc, lastmod } : { loc };
    }).filter((e) => e.loc);
    return { kind: "urlset", entries };
  }
  return { kind: "invalid", reason: "No <urlset> or <sitemapindex> element found, so this is not a valid sitemap." };
}

/** W3C datetime as used by sitemaps: YYYY, YYYY-MM, YYYY-MM-DD or a full date-time with timezone. */
export function isValidLastmod(value: string): boolean {
  if (!/^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?)?)?$/.test(value)) return false;
  const t = Date.parse(value.length === 4 ? `${value}-01-01` : value.length === 7 ? `${value}-01` : value);
  return !Number.isNaN(t);
}

export type SitemapIssue = { level: "error" | "warning" | "info"; message: string };

export type SitemapAnalysis = {
  urlCount: number;
  uniqueUrlCount: number;
  withLastmod: number;
  issues: SitemapIssue[];
  /** First URLs worth spot-checking for status codes. */
  sample: string[];
};

export function analyzeUrlset(entries: SitemapEntry[], siteOrigin: string, now = new Date(), sampleSize = 10): SitemapAnalysis {
  const issues: SitemapIssue[] = [];
  const locs = entries.map((e) => e.loc);
  const unique = new Set(locs);
  const siteHost = new URL(siteOrigin).hostname.replace(/^www\./, "");

  if (entries.length > MAX_URLS_PER_SITEMAP) issues.push({ level: "error", message: `${entries.length} URLs exceeds the 50,000 limit per sitemap file. Split it with a sitemap index.` });
  if (entries.length === 0) issues.push({ level: "error", message: "The sitemap lists no URLs." });
  if (unique.size < locs.length) issues.push({ level: "warning", message: `${locs.length - unique.size} duplicate URL${locs.length - unique.size === 1 ? "" : "s"} listed.` });

  const invalid = locs.filter((l) => { try { const u = new URL(l); return u.protocol !== "http:" && u.protocol !== "https:"; } catch { return true; } });
  if (invalid.length) issues.push({ level: "error", message: `${invalid.length} entr${invalid.length === 1 ? "y is" : "ies are"} not valid absolute URLs (for example ${invalid[0].slice(0, 80)}).` });

  const valid = locs.filter((l) => !invalid.includes(l));
  const foreign = valid.filter((l) => new URL(l).hostname.replace(/^www\./, "") !== siteHost);
  if (foreign.length) issues.push({ level: "warning", message: `${foreign.length} URL${foreign.length === 1 ? " is" : "s are"} on a different domain than the site (for example ${foreign[0].slice(0, 80)}). Search engines ignore them.` });
  const insecure = valid.filter((l) => l.startsWith("http://"));
  if (insecure.length) issues.push({ level: "warning", message: `${insecure.length} URL${insecure.length === 1 ? " uses" : "s use"} http:// instead of https://.` });
  const withQuery = valid.filter((l) => new URL(l).search);
  if (withQuery.length) issues.push({ level: "info", message: `${withQuery.length} URL${withQuery.length === 1 ? " has" : "s have"} query parameters. Sitemaps should list canonical URLs only.` });

  const mods = entries.filter((e) => e.lastmod);
  const badMods = mods.filter((e) => !isValidLastmod(e.lastmod!));
  if (badMods.length) issues.push({ level: "warning", message: `${badMods.length} lastmod value${badMods.length === 1 ? " is" : "s are"} not a valid date (for example "${badMods[0].lastmod}"). Use YYYY-MM-DD.` });
  if (entries.length && mods.length === 0) issues.push({ level: "info", message: "No URLs have a lastmod date. Accurate lastmod dates help crawlers prioritize fresh pages." });
  else if (mods.length && mods.length < entries.length) issues.push({ level: "info", message: `${entries.length - mods.length} of ${entries.length} URLs have no lastmod date.` });
  const goodMods = mods.filter((e) => isValidLastmod(e.lastmod!)).map((e) => Date.parse(e.lastmod!.length === 4 ? `${e.lastmod}-01-01` : e.lastmod!.length === 7 ? `${e.lastmod}-01` : e.lastmod!));
  if (goodMods.length) {
    const newest = Math.max(...goodMods);
    if (now.getTime() - newest > 365 * 24 * 3600 * 1000) issues.push({ level: "warning", message: "The newest lastmod is over a year old. If the site changed since, the dates are not being updated." });
    if (goodMods.length > 1 && new Set(goodMods).size === 1) issues.push({ level: "info", message: "Every lastmod date is identical, which suggests it is set to the build date rather than the page's real change date." });
    if (goodMods.some((t) => t > now.getTime() + 24 * 3600 * 1000)) issues.push({ level: "warning", message: "Some lastmod dates are in the future." });
  }

  return { urlCount: entries.length, uniqueUrlCount: unique.size, withLastmod: mods.length, issues, sample: [...unique].filter((l) => !invalid.includes(l)).slice(0, sampleSize) };
}

/** Sitemap URLs declared in robots.txt (the Sitemap directive is case-insensitive and global). */
export function sitemapsFromRobots(robotsTxt: string): string[] {
  return [...robotsTxt.matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)].map((m) => m[1]);
}
