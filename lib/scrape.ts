import * as cheerio from "cheerio";
import { ExtractedData } from "@/types/report";
import { ScrapedData } from "@/types/index";
import { safeFetch } from "@/lib/url-safety";

function normalizeSchemaTypeLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const clean = trimmed.replace(/^https?:\/\/schema\.org\//i, "");
  const splitOnHash = clean.split("#").pop() || clean;
  const splitOnSlash = splitOnHash.split("/").pop() || splitOnHash;
  return splitOnSlash.trim();
}

function extractSchemaTypesFromDom($: cheerio.CheerioAPI): string[] {
  const schemaTypes: string[] = [];

  // JSON-LD
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).html() || "");
      const rootItems = Array.isArray(parsed) ? parsed : [parsed];
      const graphItems = Array.isArray(parsed?.["@graph"]) ? parsed["@graph"] : [];
      [...rootItems, ...graphItems].forEach((item: { "@type"?: string | string[] }) => {
        if (!item?.["@type"]) return;
        const values = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
        values.forEach((value) => {
          const normalized = normalizeSchemaTypeLabel(String(value));
          if (normalized) schemaTypes.push(normalized);
        });
      });
    } catch {
      // ignore malformed JSON-LD
    }
  });

  // Microdata itemtype
  $("[itemtype]").each((_, el) => {
    const itemtype = ($(el).attr("itemtype") || "").trim();
    if (!itemtype) return;
    itemtype.split(/\s+/).forEach((raw) => {
      const normalized = normalizeSchemaTypeLabel(raw);
      if (normalized) schemaTypes.push(normalized);
    });
  });

  // RDFa typeof
  $("[typeof]").each((_, el) => {
    const typeOf = ($(el).attr("typeof") || "").trim();
    if (!typeOf) return;
    typeOf.split(/\s+/).forEach((raw) => {
      const normalized = normalizeSchemaTypeLabel(raw);
      if (normalized) schemaTypes.push(normalized);
    });
  });

  return Array.from(new Set(schemaTypes));
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, "");
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);
  parsed.hash = "";
  return parsed.toString();
}

function isPublicHttpUrl(parsed: URL): boolean {
  const validProtocol = parsed.protocol === "http:" || parsed.protocol === "https:";
  const host = parsed.hostname.toLowerCase();
  const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];
  const isPrivateIp =
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
    /^169\.254\./.test(host);
  return validProtocol && Boolean(parsed.hostname) && !blockedHosts.includes(host) && !isPrivateIp;
}

export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return isPublicHttpUrl(parsed);
  } catch {
    return false;
  }
}

export async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const { response: res, finalUrl } = await safeFetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AEOCheckScanner/1.0; +https://www.aeocheck.co)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!validateUrl(finalUrl)) {
      throw new Error("Invalid URL. Only public http(s) URLs are supported.");
    }

    if (!res.ok) {
      if (res.status === 403 || res.status === 401) throw new Error("Blocked by target website");
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      throw new Error("URL does not return an HTML page.");
    }

    const contentLength = Number(res.headers.get("content-length") || 0);
    if (contentLength > 2_500_000) throw new Error("HTML response is too large to analyze in the demo scanner.");

    const text = await res.text();
    if (!text.trim()) throw new Error("Empty HTML response");
    return text.slice(0, 2_500_000);
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJinaReaderText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const readerUrl = `https://r.jina.ai/${url}`;
  // Default markdown output. ("X-Respond-With: no-content" made the reader reject every request.)
  const headers: Record<string, string> = {
    Accept: "text/plain",
  };

  if (process.env.JINA_API_KEY) {
    headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
  }

  try {
    const res = await fetch(readerUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers,
    });

    if (!res.ok) {
      throw new Error(`scrape:jina:http:${res.status}`);
    }

    const text = await res.text();
    if (!text.trim()) throw new Error("scrape:jina:empty");
    return text.slice(0, 50000);
  } finally {
    clearTimeout(timeout);
  }
}

export function parseReaderTextToScrapedData(
  readerText: string,
  baseUrl: string
): ScrapedData {
  const lines = readerText.split(/\r?\n/).map((line) => line.trim());
  const titleLine = lines.find((line) => line.toLowerCase().startsWith("title:"));
  const title = titleLine?.replace(/^title:\s*/i, "").trim() || new URL(baseUrl).hostname;
  const markdownIndex = lines.findIndex((line) => line.toLowerCase().includes("markdown content"));
  const contentLines = markdownIndex >= 0 ? lines.slice(markdownIndex + 1) : lines;
  const headings = contentLines
    .filter((line) => /^#{1,3}\s+/.test(line))
    .slice(0, 60)
    .map((line) => {
      const level = line.match(/^#+/)?.[0].length ?? 2;
      const text = line.replace(/^#{1,6}\s+/, "").trim();
      return `H${Math.min(level, 3)}: ${text}`;
    });
  const bodyText = contentLines
    .join(" ")
    .replace(/^#+\s+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000);
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  return {
    url: baseUrl,
    title,
    metaDescription: "",
    canonical: "",
    headings,
    schemaTypes: [],
    schemaBlocks: 0,
    bodyText,
    images: [],
    internalLinks: 0,
    wordCount,
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    readabilityScore: bodyText ? calculateFleschScore(bodyText) : undefined,
    source: "reader",
  };
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
  const schemaTypes: string[] = extractSchemaTypesFromDom($);
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).html() || "");
      jsonLdBlocks.push(parsed);
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

function calculateFleschScore(text: string): number {
  // Clean text - remove special chars, extra spaces
  const cleaned = text
    .replace(/[^a-zA-Z\s.!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return 0;

  // Count sentences
  const sentences = cleaned
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 3);
  const sentenceCount = Math.max(sentences.length, 1);

  // Count words
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = Math.max(words.length, 1);

  // Count syllables
  function countSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, "");
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
    word = word.replace(/^y/, "");
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  const syllableCount = words.reduce(
    (sum, word) => sum + countSyllables(word), 0
  );

  // Flesch Reading Ease formula
  const score = 206.835
    - 1.015 * (wordCount / sentenceCount)
    - 84.6 * (syllableCount / wordCount);

  // Clamp between 0-100
  return Math.round(Math.min(100, Math.max(0, score)));
}

export function parseHtmlToScrapedData(
  html: string,
  baseUrl: string
): ScrapedData {
  const $ = cheerio.load(html);
  const parsedBase = new URL(baseUrl);

  // Basic metadata
  const title = $("title").first().text().trim();
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() ?? "";
  const ogTitle =
    $('meta[property="og:title"]').attr("content")?.trim() ?? "";
  const ogDescription =
    $('meta[property="og:description"]').attr("content")?.trim() ?? "";
  const ogImage =
    $('meta[property="og:image"]').attr("content")?.trim() ?? "";
  const canonical =
    $('link[rel="canonical"]').attr("href")?.trim() ?? "";

  // Collect all headings with type prefix
  const headings: string[] = [];

  $("h1").each((_, el) => {
    const text = $(el).text().trim();
    if (text) headings.push(`H1: ${text}`);
  });

  $("h2").each((_, el) => {
    const text = $(el).text().trim();
    if (text) headings.push(`H2: ${text}`);
  });

  $("h3").each((_, el) => {
    const text = $(el).text().trim();
    if (text) headings.push(`H3: ${text}`);
  });

  // JSON-LD schemas
  let schemaBlocks = 0;
  const schemaTypes: string[] = extractSchemaTypesFromDom($);
  $('script[type="application/ld+json"]').each(() => {
    schemaBlocks++;
  });

  // Images with alt text tracking
  const images: { hasAlt: boolean }[] = [];
  $("img").each((_, el) => {
    const alt = $(el).attr("alt");
    images.push({
      hasAlt: Boolean(alt && alt.trim() !== ""),
    });
  });

  // Links
  let internalLinks = 0;
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.hostname === parsedBase.hostname) {
        internalLinks++;
      }
    } catch {
      // relative link counts as internal
      internalLinks++;
    }
  });

  // Body text - strip nav/footer/header/script/style first
  const bodyHtml = html; // Keep original for extraction
  const cleanHtml = bodyHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "")
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "");

  const $clean = cheerio.load(cleanHtml);
  const rawText = $clean("body").text().replace(/\s+/g, " ").trim();
  const bodyText = rawText.slice(0, 8000);

  // Word count
  const wordCount = bodyText
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  // E-E-A-T signals

  // 1. Author detection
  const authorSelectors = [
    '[rel="author"]',
    '[class*="author"]',
    '[class*="byline"]',
    '[itemprop="author"]',
    "[data-author]",
    ".post-author",
    ".article-author",
  ];
  let hasAuthor = false;
  for (const selector of authorSelectors) {
    if ($(selector).length > 0) {
      hasAuthor = true;
      break;
    }
  }
  // Also check schema for author
  const hasPersonSchema = schemaTypes.some((t) =>
    ["Person", "author"].includes(t)
  );
  if (hasPersonSchema) hasAuthor = true;

  // 2. About/Contact page detection from links
  let hasAboutPage = false;
  let hasContactPage = false;
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") || "").toLowerCase();
    const text = ($(el).text() || "").toLowerCase().trim();
    if (
      href.includes("/about") ||
      text === "about" ||
      text === "about us" ||
      text === "our team" ||
      text === "who we are"
    ) hasAboutPage = true;
    if (
      href.includes("/contact") ||
      text === "contact" ||
      text === "contact us" ||
      text === "get in touch"
    ) hasContactPage = true;
  });

  // 3. Date signals
  let datePublished = "";
  let dateModified = "";

  // Check meta tags
  datePublished = $('meta[property="article:published_time"]').attr("content")?.trim()
    || $('meta[name="date"]').attr("content")?.trim()
    || $('meta[name="publish-date"]').attr("content")?.trim()
    || "";

  dateModified = $('meta[property="article:modified_time"]').attr("content")?.trim()
    || $('meta[name="last-modified"]').attr("content")?.trim()
    || "";

  // Check schema for dates
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).html() || "");
      const items = Array.isArray(parsed) ? parsed : [parsed];
      items.forEach((item: Record<string, string>) => {
        if (item.datePublished && !datePublished) datePublished = item.datePublished;
        if (item.dateModified && !dateModified) dateModified = item.dateModified;
      });
    } catch {
      // ignore
    }
  });

  // Check time elements
  if (!datePublished) {
    const timeEl = $("time[datetime]").first();
    if (timeEl.length) datePublished = timeEl.attr("datetime") || "";
  }

  // Readability score
  const readabilityScore = calculateFleschScore(bodyText);

  return {
    url: baseUrl,
    title,
    metaDescription,
    canonical,
    headings,
    schemaTypes,
    schemaBlocks,
    bodyText,
    images,
    internalLinks,
    wordCount,
    ogTitle,
    ogDescription,
    ogImage,
    hasAuthor,
    hasAboutPage,
    hasContactPage,
    datePublished,
    dateModified,
    hasPersonSchema,
    readabilityScore,
  };
}


