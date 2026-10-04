import type { CheckResult, ScanResult } from "@/types/index";
import { buildRobotsTxt } from "@/lib/robots-generator";
import { buildLlmsTxt, guessSiteName } from "@/lib/llms-txt";
import { buildOrgSchema } from "@/lib/org-schema";
import { jsonLdScriptTag } from "@/lib/jsonld";

/**
 * Ready-to-paste fixes generated from a finished scan. Everything is built from data the report
 * already holds (URL, metadata, check results), using the same builders as the free tools, so
 * the files agree with what the scanner and tools check. Nothing here calls the network or an AI.
 */

export type FixPackItem = {
  id: "robots" | "org-schema" | "llms-txt" | "head-tags";
  title: string;
  /** Where the content goes, in plain words. */
  placement: string;
  /** Suggested download file name. */
  filename: string;
  content: string;
  why: string;
  /** Check ids this item addresses. */
  checkIds: string[];
};

type FixInput = Pick<ScanResult, "url" | "checks" | "metadata" | "schemaTypes">;

function statusOf(checks: CheckResult[], id: string): CheckResult["status"] | undefined {
  return checks.find((c) => c.id === id)?.status;
}

const needsFix = (checks: CheckResult[], id: string) => {
  const s = statusOf(checks, id);
  return s !== undefined && s !== "pass";
};

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function buildFixPack(input: FixInput): FixPackItem[] {
  const { checks, metadata } = input;
  const origin = originOf(input.url);
  if (!origin) return [];
  const items: FixPackItem[] = [];
  const title = metadata?.title?.trim() ?? "";
  const description = metadata?.metaDescription?.trim() ?? "";
  const siteName = guessSiteName({ title, url: input.url });

  // Only a confirmed block counts: "warn" means the scanner could not verify access.
  const botsBlocked = statusOf(checks, "ai_bot_access") === "fail";
  if (botsBlocked || needsFix(checks, "robots")) {
    items.push({
      id: "robots",
      title: "robots.txt that welcomes AI crawlers",
      placement: `Publish at ${origin}/robots.txt (replace the file, or merge it and keep any Disallow rules for private paths).`,
      filename: "robots.txt",
      content: buildRobotsTxt({
        policy: "open",
        sitemapUrl: needsFix(checks, "sitemap") ? `${origin}/sitemap.xml` : undefined,
      }),
      why: botsBlocked
        ? "Your robots.txt blocks at least one AI crawler, so those engines cannot read or cite your pages."
        : "No robots.txt was found. An explicit file states which crawlers are welcome.",
      checkIds: ["ai_bot_access", "robots"].filter((id) => needsFix(checks, id)),
    });
  }

  const hasOrg = (input.schemaTypes ?? []).some((t) => /^(Organization|LocalBusiness|Corporation|NGO|OnlineStore)$/i.test(t));
  if (needsFix(checks, "schema_present") && !hasOrg) {
    items.push({
      id: "org-schema",
      title: "Organization and WebSite schema",
      placement: "Paste into the <head> of your homepage (or sitewide).",
      filename: "organization-schema.html",
      content: jsonLdScriptTag(
        buildOrgSchema({ name: siteName, url: origin, description: description || undefined, includeWebSite: true }),
      ),
      why: "Structured data tells AI systems who you are without guessing. Add your logo and profile links in the Organization schema generator.",
      checkIds: ["schema_present"],
    });
  }

  if (needsFix(checks, "llms_txt")) {
    items.push({
      id: "llms-txt",
      title: "llms.txt starter",
      placement: `Publish at ${origin}/llms.txt.`,
      filename: "llms.txt",
      content: buildLlmsTxt({
        siteName,
        summary: description,
        pages: [{ url: input.url, title: title || siteName, description }],
      }),
      why: "A short summary file for AI systems. This lists the scanned page only: use the llms.txt generator to add your key pages.",
      checkIds: ["llms_txt"],
    });
  }

  const tags: string[] = [];
  const checkIds: string[] = [];
  if (needsFix(checks, "canonical")) {
    tags.push(`<link rel="canonical" href="${escapeAttr(input.url)}">`);
    checkIds.push("canonical");
  }
  if (needsFix(checks, "og_tags")) {
    const ogTitle = metadata?.ogTitle?.trim() || title || metadata?.h1?.trim() || "";
    const ogDescription = metadata?.ogDescription?.trim() || description;
    if (ogTitle) tags.push(`<meta property="og:title" content="${escapeAttr(ogTitle)}">`);
    if (ogDescription) tags.push(`<meta property="og:description" content="${escapeAttr(ogDescription)}">`);
    tags.push(`<meta property="og:type" content="website">`);
    tags.push(`<meta property="og:url" content="${escapeAttr(input.url)}">`);
    checkIds.push("og_tags");
  }
  if (tags.length) {
    items.push({
      id: "head-tags",
      title: "Head tags for this page",
      placement: "Paste inside the <head> of the scanned page.",
      filename: "head-tags.html",
      content: `${tags.join("\n")}\n`,
      why: "Canonical and Open Graph tags tell crawlers and link previews which version of the page to use and how to describe it. Review the text before publishing.",
      checkIds,
    });
  }

  return items;
}
