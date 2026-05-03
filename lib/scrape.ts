import * as cheerio from "cheerio";
import { ExtractedData } from "@/types/report";
import { ScrapedData } from "@/types/index";

export function normalizeUrl(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, "");
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);
  parsed.hash = "";
  return parsed.toString();
}

export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const validProtocol = parsed.protocol === "http:" || parsed.protocol === "https:";
    const host = parsed.hostname.toLowerCase();
    const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];
    const isPrivateIp =
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      /^169\.254\./.test(host);
    return validProtocol && Boolean(parsed.hostname) && !blockedHosts.includes(host) && !isPrivateIp;
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
      redirect: "follow",
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
  const headers: Record<string, string> = {
    Accept: "text/plain",
    "X-Respond-With": "no-content",
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
      throw new Error(`Jina Reader returned HTTP ${res.status}.`);
    }

    const text = await res.text();
    if (!text.trim()) throw new Error("Jina Reader returned empty content.");
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
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).html() || "");
      jsonLdBlocks.push(parsed);
      const graphItems = Array.isArray(parsed?.["@graph"]) ? parsed["@graph"] : [];
      const types = [...(Array.isArray(parsed) ? parsed : [parsed]), ...graphItems];
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
    schemaTypes: Array.from(new Set(schemaTypes)),
    imageCount,
    imagesMissingAlt,
    internalLinks,
    externalLinks,
    bodyText,
  };
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
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    schemaBlocks++;
    try {
      const parsed = JSON.parse($(el).html() || "");
      const graphItems = Array.isArray(parsed?.["@graph"])
        ? parsed["@graph"]
        : [];
      const types = [
        ...(Array.isArray(parsed) ? parsed : [parsed]),
        ...graphItems,
      ];
      types.forEach((item: { "@type"?: string | string[] }) => {
        if (item["@type"]) {
          const t = Array.isArray(item["@type"])
            ? item["@type"]
            : [item["@type"]];
          schemaTypes.push(...t);
        }
      });
    } catch {
      // ignore malformed JSON-LD
    }
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

  return {
    url: baseUrl,
    title,
    metaDescription,
    headings,
    schemaTypes: Array.from(new Set(schemaTypes)),
    schemaBlocks,
    bodyText,
    images,
    internalLinks,
    wordCount,
    ogTitle,
    ogDescription,
    ogImage,
  };
}
