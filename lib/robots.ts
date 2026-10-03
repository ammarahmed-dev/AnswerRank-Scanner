/**
 * AI crawler access from robots.txt, following the robots.txt grouping rules: consecutive
 * User-agent lines share the rule block that follows, a crawler uses its own group if it has one
 * and otherwise the "*" group, and the longest matching rule wins (Allow wins ties).
 */

// Crawlers that feed AI answers and AI search (lowercase robots.txt tokens).
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

export function analyzeAiCrawlerAccess(robotsBody: string): {
  status: "pass" | "warn" | "fail";
  detail: string;
  blocked: string[];
} {
  const groups = parseRobotsGroups(robotsBody);
  const blocked = Object.keys(AI_CRAWLERS).filter((agent) => !isRootAllowed(groups, agent));
  const names = blocked.map((agent) => AI_CRAWLERS[agent]);

  if (blocked.length === Object.keys(AI_CRAWLERS).length) {
    return { status: "fail", detail: "robots.txt blocks all AI crawlers - this site is invisible to AI search engines", blocked };
  }
  if (blocked.length) {
    const majors = ["gptbot", "oai-searchbot", "claudebot", "perplexitybot"];
    const status = blocked.some((agent) => majors.includes(agent)) ? "fail" : "warn";
    return { status, detail: `AI crawlers blocked: ${names.join(", ")}`, blocked };
  }
  const explicit = groups.some((g) => g.agents.some((agent) => agent in AI_CRAWLERS));
  return {
    status: "pass",
    detail: explicit ? "AI crawlers are explicitly allowed in robots.txt" : "AI crawlers have access to this page",
    blocked,
  };
}
