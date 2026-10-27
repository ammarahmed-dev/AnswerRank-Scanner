/**
 * AI crawler access from robots.txt, following the robots.txt grouping rules: consecutive
 * User-agent lines share the rule block that follows, a crawler uses its own group if it has one
 * and otherwise the "*" group, and the longest matching rule wins (Allow wins ties).
 */

// Crawlers that feed AI answers and AI search (lowercase robots.txt tokens). Sources: OpenAI,
// Anthropic, Perplexity and Google crawler documentation (see docs/RESEARCH.md).
export const AI_CRAWLERS: Record<string, string> = {
  gptbot: "GPTBot (OpenAI)",
  "oai-searchbot": "OAI-SearchBot (ChatGPT search)",
  "chatgpt-user": "ChatGPT-User",
  claudebot: "ClaudeBot (Anthropic)",
  "claude-searchbot": "Claude-SearchBot",
  "claude-user": "Claude-User",
  "anthropic-ai": "anthropic-ai",
  perplexitybot: "PerplexityBot",
  "perplexity-user": "Perplexity-User",
  "google-extended": "Google-Extended (Gemini)",
  "applebot-extended": "Applebot-Extended",
  "cohere-ai": "cohere-ai",
};

// Crawlers that decide whether a site can appear (and be cited) in AI search answers.
// Their access is one signal; this does not establish whether an engine cites the site.
export const AI_SEARCH_CRAWLERS = ["oai-searchbot", "claude-searchbot", "perplexitybot"];
// Training-focused tokens: blocking opts content out of model training but does not remove the
// site from AI search answers (Google-Extended also covers grounding in Gemini apps).
export const AI_TRAINING_CRAWLERS = ["gptbot", "claudebot", "anthropic-ai", "google-extended", "applebot-extended", "cohere-ai"];

// Agents that fetch a page because a person asked about it. Vendors note robots.txt may not apply.
export const AI_USER_AGENTS = ["chatgpt-user", "claude-user", "perplexity-user"];

type Rule = { allow: boolean; path: string };
type Group = { agents: string[]; rules: Rule[] };

export function parseRobotsGroups(body: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const sep = line.indexOf(":");
    if (sep < 0) continue;
    const field = line.slice(0, sep).trim().toLowerCase();
    const value = line.slice(sep + 1).trim();

    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((field === "allow" || field === "disallow") && current) {
      // An empty Disallow means "allow everything" and adds no rule.
      if (value) current.rules.push({ allow: field === "allow", path: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  return groups;
}

function rulesFor(groups: Group[], agent: string): Rule[] | null {
  const own = groups.filter((g) => g.agents.includes(agent));
  if (own.length) return own.flatMap((g) => g.rules);
  const wildcard = groups.filter((g) => g.agents.includes("*"));
  return wildcard.length ? wildcard.flatMap((g) => g.rules) : null;
}

/** Whether `agent` may fetch the site root under these rules. */
export function isRootAllowed(groups: Group[], agent: string): boolean {
  const rules = rulesFor(groups, agent);
  if (!rules) return true;
  const matching = rules.filter((r) => r.path === "/" || r.path === "/*" || r.path === "/$" || "/".startsWith(r.path.replace(/\*$/, "")));
  if (!matching.length) return true;
  const best = matching.reduce((a, b) => (b.path.length > a.path.length || (b.path.length === a.path.length && b.allow) ? b : a));
  return best.allow;
}

export function analyzeAiCrawlerAccess(robotsBody: string, pathWithQuery = "/"): {
  status: "pass" | "warn" | "fail";
  detail: string;
  blocked: string[];
} {
  const groups = parseRobotsGroups(robotsBody);
  const blocked = Object.keys(AI_CRAWLERS).filter((agent) => !testRobotsAccess(robotsBody, agent, pathWithQuery).allowed);
  const names = blocked.map((agent) => AI_CRAWLERS[agent]);

  if (blocked.length === Object.keys(AI_CRAWLERS).length) {
    return { status: "fail", detail: "robots.txt blocks all listed AI crawlers for this page", blocked };
  }
  if (blocked.length) {
    const searchBlocked = blocked.filter((agent) => AI_SEARCH_CRAWLERS.includes(agent));
    if (searchBlocked.length) {
      return {
        status: "fail",
        detail: `AI search crawlers blocked: ${searchBlocked.map((a) => AI_CRAWLERS[a]).join(", ")} - crawling this page is disallowed by these rules`,
        blocked,
      };
    }
    return {
      status: "warn",
      detail: `AI search crawlers are allowed. Other blocked agents (training only or user requests): ${names.join(", ")}`,
      blocked,
    };
  }
  const explicit = groups.some((g) => g.agents.some((agent) => agent in AI_CRAWLERS));
  return {
    status: "pass",
    detail: explicit ? "AI crawlers are explicitly allowed in robots.txt" : "AI crawlers have access to this page",
    blocked,
  };
}

export type CrawlerKind = "search" | "training" | "user";
export type CrawlerAccess = {
  token: string;
  label: string;
  kind: CrawlerKind;
  allowed: boolean;
  /** Which robots.txt group decided it: the crawler's own group, the "*" group, or no rule at all. */
  source: "own" | "wildcard" | "default";
};

/** Per-token robots rule test for the requested path/query; not observed crawler access. */
export function describeAiCrawlerAccess(robotsBody: string, pathWithQuery = "/"): CrawlerAccess[] {
  return Object.entries(AI_CRAWLERS).map(([token, label]) => {
    const kind: CrawlerKind = AI_SEARCH_CRAWLERS.includes(token) ? "search" : AI_USER_AGENTS.includes(token) ? "user" : "training";
    const access = testRobotsAccess(robotsBody, token, pathWithQuery);
    return { token, label, kind, allowed: access.allowed, source: access.source === "none" ? "default" : access.source };
  });
}

export type RobotsTestResult = {
  allowed: boolean;
  /** The rule that decided the outcome, or null when no rule matched (allowed by default). */
  rule: { allow: boolean; path: string } | null;
  /** Which group supplied the rules: the agent's own group, the "*" group, or none. */
  source: "own" | "wildcard" | "none";
};

function patternToRegExp(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

/**
 * Whether `agent` may fetch `pathWithQuery` (e.g. "/blog/post?x=1") under this robots.txt.
 * Longest matching pattern wins, Allow wins ties, `*` and `$` are supported (RFC 9309).
 */
export function testRobotsAccess(robotsBody: string, agent: string, pathWithQuery: string): RobotsTestResult {
  const groups = parseRobotsGroups(robotsBody);
  const token = agent.trim().toLowerCase();
  const own = groups.filter((g) => g.agents.includes(token));
  const wildcard = groups.filter((g) => g.agents.includes("*"));
  const source: RobotsTestResult["source"] = own.length ? "own" : wildcard.length ? "wildcard" : "none";
  const rules = (own.length ? own : wildcard).flatMap((g) => g.rules);
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;

  const matching = rules.filter((r) => patternToRegExp(r.path).test(path));
  if (!matching.length) return { allowed: true, rule: null, source };
  const best = matching.reduce((a, b) => (b.path.length > a.path.length || (b.path.length === a.path.length && b.allow) ? b : a));
  return { allowed: best.allow, rule: best, source };
}
