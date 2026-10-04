// Builds an llms.txt file (https://llmstxt.org): an H1 with the site name, a blockquote summary,
// then H2 sections of "- [Title](url): description" links. "Optional" holds secondary pages.

export type LlmsPage = { url: string; title: string; description: string };

const SECTION_RULES: Array<{ section: string; pattern: RegExp }> = [
  { section: "Product", pattern: /\/(features?|product|products|solutions?|platform|pricing|plans|services?|how-it-works|integrations?)(\/|$)/i },
  { section: "Docs", pattern: /\/(docs?|documentation|guides?|help|support|faq|api|learn|resources?)(\/|$)/i },
  { section: "Blog", pattern: /\/(blog|news|articles?|insights|posts?)(\/|$)/i },
  { section: "Company", pattern: /\/(about|team|company|careers|contact|press)(\/|$)/i },
];

const OPTIONAL = /\/(privacy|terms|legal|cookies?|refund|policy|dpa|gdpr|sla|subprocessors|login|signin|signup|register|cart|checkout|account)(\/|$|-)/i;

function clean(text: string, max: number): string {
  const collapsed = text.replace(/\s+/g, " ").replace(/[\[\]]/g, "").trim();
  return collapsed.length > max ? `${collapsed.slice(0, max - 1).trimEnd()}...` : collapsed;
}

/** Strips a trailing " | Brand" / " - Brand" so link titles read naturally. */
export function cleanTitle(title: string, siteName: string): string {
  const parts = title.split(/\s+[|–—-]\s+/);
  const withoutBrand = parts.filter((p) => p.trim().toLowerCase() !== siteName.trim().toLowerCase());
  return clean(withoutBrand.join(" - ") || title, 90);
}

export function sectionFor(url: string): string {
  let path = "/";
  try {
    path = new URL(url).pathname;
  } catch {
    return "Pages";
  }
  if (OPTIONAL.test(path)) return "Optional";
  return SECTION_RULES.find((r) => r.pattern.test(path))?.section ?? "Pages";
}

export function buildLlmsTxt(input: { siteName: string; summary: string; pages: LlmsPage[] }): string {
  const siteName = clean(input.siteName, 80) || "Website";
  const lines = [`# ${siteName}`, ""];
  const summary = clean(input.summary, 300);
  if (summary) lines.push(`> ${summary}`, "");

  const order = ["Pages", "Product", "Docs", "Blog", "Company", "Optional"];
  const groups = new Map<string, LlmsPage[]>();
  const seen = new Set<string>();
  for (const page of input.pages) {
    const key = page.url.replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    const section = sectionFor(page.url);
    groups.set(section, [...(groups.get(section) ?? []), page]);
  }

  for (const section of order) {
    const pages = groups.get(section);
    if (!pages?.length) continue;
    lines.push(`## ${section}`, "");
    for (const page of pages) {
      const title = cleanTitle(page.title || page.url, siteName);
      const description = clean(page.description, 160);
      lines.push(`- [${title}](${page.url})${description ? `: ${description}` : ""}`);
    }
    lines.push("");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

/** Best-effort brand name from og:site_name, then the homepage title, then the domain. */
export function guessSiteName(opts: { ogSiteName?: string; title?: string; url: string }): string {
  if (opts.ogSiteName?.trim()) return opts.ogSiteName.trim();
  const title = opts.title?.trim() ?? "";
  const parts = title.split(/\s+[|–—-]\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) return parts.sort((a, b) => a.length - b.length)[0];
  if (title && title.length <= 40) return title;
  try {
    const host = new URL(opts.url).hostname.replace(/^www\./, "");
    const name = host.split(".")[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return "Website";
  }
}

const KEY_PATHS = /^\/(pricing|plans|features?|product|products|solutions?|platform|docs?|documentation|api|guides?|help|support|faq|about|company|contact|blog|resources?|integrations?|customers|security|how-it-works)\/?$/i;

/**
 * Picks the pages most worth listing: key sections first, then shallow pages, with at most
 * `perFolder` pages from the same top-level folder (so 50 case studies cannot crowd out pricing).
 */
export function rankPages(urls: string[], origin: string, max: number, perFolder = 3): string[] {
  const scored = urls
    .map((url) => {
      let path = "/";
      try {
        const u = new URL(url);
        if (u.origin !== origin) return null;
        path = u.pathname.replace(/\/+$/, "") || "/";
      } catch {
        return null;
      }
      if (path === "/") return null;
      const depth = path.split("/").filter(Boolean).length;
      const optional = sectionFor(url) === "Optional";
      const score = (KEY_PATHS.test(path) ? 0 : 10) + depth * 3 + (optional ? 40 : 0) + path.length / 100;
      return { url, path, score, folder: path.split("/")[1] ?? "" };
    })
    .filter((x): x is { url: string; path: string; score: number; folder: string } => x !== null)
    .sort((a, b) => a.score - b.score);

  const perFolderCount = new Map<string, number>();
  const picked: string[] = [];
  for (const item of scored) {
    const isKey = KEY_PATHS.test(item.path);
    const count = perFolderCount.get(item.folder) ?? 0;
    if (!isKey && count >= perFolder) continue;
    perFolderCount.set(item.folder, count + 1);
    picked.push(item.url);
    if (picked.length >= max) break;
  }
  return picked;
}
