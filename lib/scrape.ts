import * as cheerio from "cheerio";
import { ExtractedData } from "@/types/report";

export function normalizeUrl(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, "");
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return `https://${trimmed}`;
  return trimmed;
}

export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const validProtocol = parsed.protocol === "http:" || parsed.protocol === "https:";
    const host = parsed.hostname.toLowerCase();
    const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0"];
    return validProtocol && !blockedHosts.includes(host);
  } catch {
    return false;
  }
}

export async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AnswerRankScanner/1.0; +https://answerrankscanner.com)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!res.ok) {
      if (res.status === 403 || res.status === 401) throw new Error("Blocked by target website");
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      throw new Error("URL does not return an HTML page.");
    }

    const text = await res.text();
    if (!text.trim()) throw new Error("Empty HTML response");
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

export function parseHtml(html: string, baseUrl: string): ExtractedData {
  const $ = cheerio.load(html);
  const parsedBase = new URL(baseUrl);

  // Basic metadata
  const pageTitle = $("title").first().text().trim();
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() ?? "";
  const canonicalUrl =
    $('link[rel="canonical"]').attr("href")?.trim() ?? "";

  // Open Graph
  const ogTitle =
    $('meta[property="og:title"]').attr("content")?.trim() ?? "";
  const ogDescription =
    $('meta[property="og:description"]').attr("content")?.trim() ?? "";

  // Twitter
  const twitterTitle =
    $('meta[name="twitter:title"]').attr("content")?.trim() ?? "";
  const twitterDescription =
    $('meta[name="twitter:description"]').attr("content")?.trim() ?? "";

  // Headings
  const h1Tags: string[] = [];
  $("h1").each((_, el) => {
    const text = $(el).text().trim();
    if (text) h1Tags.push(text);
  });

  const h2Tags: string[] = [];
  $("h2").each((_, el) => {
    const text = $(el).text().trim();
    if (text) h2Tags.push(text);
  });

  // JSON-LD schemas
  const jsonLdBlocks: object[] = [];
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).html() || "");
      jsonLdBlocks.push(parsed);
      const types = Array.isArray(parsed) ? parsed : [parsed];
      types.forEach((item: { "@type"?: string | string[] }) => {
        if (item["@type"]) {
          const t = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
          schemaTypes.push(...t);
        }
      });
    } catch {
      // ignore malformed JSON-LD
    }
  });

  // Images
  const images = $("img");
  const imageCount = images.length;
  let imagesMissingAlt = 0;
  images.each((_, el) => {
    const alt = $(el).attr("alt");
    if (!alt || alt.trim() === "") imagesMissingAlt++;
  });

  // Links
  let internalLinks = 0;
  let externalLinks = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.hostname === parsedBase.hostname) {
        internalLinks++;
      } else {
        externalLinks++;
      }
    } catch {
      // relative link
      internalLinks++;
    }
  });

  // Body text
  $("script, style, noscript, nav, footer, header").remove();
  const rawText = $("body").text().replace(/\s+/g, " ").trim();
  const bodyText = rawText.slice(0, 8000);

  return {
    pageTitle,
    metaDescription,
    h1Tags,
    h2Tags,
    canonicalUrl,
    ogTitle,
    ogDescription,
    twitterTitle,
    twitterDescription,
    jsonLdBlocks,
    schemaTypes,
    imageCount,
    imagesMissingAlt,
    internalLinks,
    externalLinks,
    bodyText,
  };
}
