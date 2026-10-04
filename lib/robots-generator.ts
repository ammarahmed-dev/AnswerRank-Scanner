import { AI_CRAWLERS, AI_SEARCH_CRAWLERS, AI_TRAINING_CRAWLERS, AI_USER_AGENTS } from "@/lib/robots";

/**
 * Builds a robots.txt that sets an explicit policy for AI crawlers. Output is parsed by the same
 * rules the scanner uses (see tests), so what this generates is what the AI crawler checker reports.
 */

export type RobotsPolicy = "open" | "search_only" | "block_all" | "custom";
export type CrawlerChoice = "allow" | "block";

export type RobotsOptions = {
  policy: RobotsPolicy;
  /** Per-crawler choice, used when policy is "custom". Crawlers missing here default to allow. */
  custom?: Record<string, CrawlerChoice>;
  sitemapUrl?: string;
  /** Paths to disallow for every other crawler, e.g. /admin or /cart. */
  disallowPaths?: string[];
};

export const CRAWLER_TOKENS = Object.keys(AI_CRAWLERS);

/** robots.txt user-agent token as published by each vendor (lowercase keys elsewhere in the app). */
const DISPLAY_TOKEN: Record<string, string> = {
  gptbot: "GPTBot",
  "oai-searchbot": "OAI-SearchBot",
  "chatgpt-user": "ChatGPT-User",
  claudebot: "ClaudeBot",
  "claude-searchbot": "Claude-SearchBot",
  "claude-user": "Claude-User",
  "anthropic-ai": "anthropic-ai",
  perplexitybot: "PerplexityBot",
  "perplexity-user": "Perplexity-User",
  "google-extended": "Google-Extended",
  "applebot-extended": "Applebot-Extended",
  "cohere-ai": "cohere-ai",
};

export function displayToken(token: string): string {
  return DISPLAY_TOKEN[token] ?? token;
}

export function choicesFor(policy: RobotsPolicy, custom: Record<string, CrawlerChoice> = {}): Record<string, CrawlerChoice> {
  const out: Record<string, CrawlerChoice> = {};
  for (const token of CRAWLER_TOKENS) {
    if (policy === "open") out[token] = "allow";
    else if (policy === "block_all") out[token] = "block";
    else if (policy === "search_only") out[token] = AI_TRAINING_CRAWLERS.includes(token) ? "block" : "allow";
    else out[token] = custom[token] ?? "allow";
  }
  return out;
}

export function normalizePath(path: string): string | null {
  const trimmed = path.trim();
  if (!trimmed || /\s/.test(trimmed)) return null;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function group(label: string, tokens: string[], rule: "Allow: /" | "Disallow: /"): string[] {
  if (!tokens.length) return [];
  return [`# ${label}`, ...tokens.map((t) => `User-agent: ${displayToken(t)}`), rule, ""];
}

export function buildRobotsTxt(options: RobotsOptions): string {
  const choices = choicesFor(options.policy, options.custom);
  const byKind = (tokens: string[]) => CRAWLER_TOKENS.filter((t) => tokens.includes(t));
  const search = byKind(AI_SEARCH_CRAWLERS);
  const user = byKind(AI_USER_AGENTS);
  const training = byKind(AI_TRAINING_CRAWLERS);

  const lines: string[] = [];
  const emit = (label: string, tokens: string[]) => {
    lines.push(...group(`${label}: allowed`, tokens.filter((t) => choices[t] === "allow"), "Allow: /"));
    lines.push(...group(`${label}: blocked`, tokens.filter((t) => choices[t] === "block"), "Disallow: /"));
  };
  emit("AI search crawlers", search);
  emit("AI training crawlers", training);
  emit("AI user-triggered agents", user);

  lines.push("# Everyone else");
  lines.push("User-agent: *");
  const paths = (options.disallowPaths ?? []).map(normalizePath).filter((p): p is string => Boolean(p));
  if (paths.length) lines.push(...paths.map((p) => `Disallow: ${p}`));
  else lines.push("Allow: /");

  const sitemap = options.sitemapUrl?.trim();
  if (sitemap) lines.push("", `Sitemap: ${sitemap}`);
  return lines.join("\n") + "\n";
}

/** Plain-language consequences of the chosen policy. */
export function robotsWarnings(options: RobotsOptions): string[] {
  const choices = choicesFor(options.policy, options.custom);
  const warnings: string[] = [];
  const blockedSearch = AI_SEARCH_CRAWLERS.filter((t) => choices[t] === "block").map(displayToken);
  if (blockedSearch.length) {
    warnings.push(`Blocking ${blockedSearch.join(", ")} removes your site from those AI search answers.`);
  }
  if (AI_USER_AGENTS.some((t) => choices[t] === "block")) {
    warnings.push("User-triggered agents (ChatGPT-User, Claude-User, Perplexity-User) fetch a page when a person asks about it, and vendors say robots.txt may not apply to them.");
  }
  if (options.sitemapUrl?.trim() && !/^https?:\/\//i.test(options.sitemapUrl.trim())) {
    warnings.push("The sitemap line should be a full URL starting with https://.");
  }
  return warnings;
}
