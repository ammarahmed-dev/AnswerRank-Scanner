import { jsonLdScriptTag } from "@/lib/jsonld";
import { isHttpUrl } from "@/lib/org-schema";

export type ArticleType = "Article" | "BlogPosting" | "NewsArticle";

export type ArticleInput = {
  type: ArticleType;
  headline: string;
  url: string;
  description?: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  authorUrl?: string;
  publisherName?: string;
  publisherLogo?: string;
};

const clean = (v?: string) => {
  const t = v?.replace(/\s+/g, " ").trim();
  return t ? t : undefined;
};

/** YYYY-MM-DD or a full ISO date-time with timezone. */
export function isIsoDate(value: string): boolean {
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?$/.test(v)) return false;
  return !Number.isNaN(Date.parse(v));
}

export function articleSchemaProblems(input: ArticleInput): string[] {
  const problems: string[] = [];
  if (!clean(input.headline)) problems.push("Enter the article headline.");
  else if (clean(input.headline)!.length > 110) problems.push("The headline is over 110 characters. Google recommends keeping it shorter.");
  if (!clean(input.url)) problems.push("Enter the article URL.");
  else if (!isHttpUrl(input.url)) problems.push("The article URL must be a full URL like https://example.com/post.");
  if (!clean(input.authorName)) problems.push("Enter the author's name.");
  if (!clean(input.datePublished)) problems.push("Enter the publish date (YYYY-MM-DD).");
  else if (!isIsoDate(input.datePublished)) problems.push("The publish date must look like 2026-10-04 or 2026-10-04T09:00:00Z.");
  if (clean(input.dateModified) && !isIsoDate(input.dateModified!)) problems.push("The modified date must look like 2026-10-04 or 2026-10-04T09:00:00Z.");
  if (clean(input.dateModified) && isIsoDate(input.datePublished) && isIsoDate(input.dateModified!) && Date.parse(input.dateModified!) < Date.parse(input.datePublished)) {
    problems.push("The modified date is earlier than the publish date.");
  }
  for (const [label, value] of [["image", input.image], ["author profile", input.authorUrl], ["publisher logo", input.publisherLogo]] as const) {
    if (clean(value) && !isHttpUrl(value!)) problems.push(`The ${label} must be a full URL starting with https://.`);
  }
  return problems;
}

export function buildArticleSchema(input: ArticleInput) {
  const url = clean(input.url) ?? "";
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": input.type,
    headline: clean(input.headline),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    datePublished: clean(input.datePublished),
  };
  const modified = clean(input.dateModified);
  node.dateModified = modified ?? clean(input.datePublished);
  const description = clean(input.description);
  if (description) node.description = description;
  const image = clean(input.image);
  if (image) node.image = [image];
  const author: Record<string, unknown> = { "@type": "Person", name: clean(input.authorName) };
  const authorUrl = clean(input.authorUrl);
  if (authorUrl) author.url = authorUrl;
  node.author = author;
  const publisherName = clean(input.publisherName);
  if (publisherName) {
    const publisher: Record<string, unknown> = { "@type": "Organization", name: publisherName };
    const logo = clean(input.publisherLogo);
    if (logo) publisher.logo = { "@type": "ImageObject", url: logo };
    node.publisher = publisher;
  }
  return node;
}

export function articleSchemaScriptTag(input: ArticleInput): string {
  return jsonLdScriptTag(buildArticleSchema(input));
}
