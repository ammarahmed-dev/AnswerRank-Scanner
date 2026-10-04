import { describe, expect, it } from "vitest";
import { buildRobotsTxt, choicesFor, normalizePath, robotsWarnings, CRAWLER_TOKENS } from "@/lib/robots-generator";
import { describeAiCrawlerAccess } from "@/lib/robots";

const allowedMap = (txt: string) => Object.fromEntries(describeAiCrawlerAccess(txt).map((c) => [c.token, c.allowed]));

describe("robots.txt generator", () => {
  it("open policy: every AI crawler is allowed when parsed back", () => {
    const txt = buildRobotsTxt({ policy: "open" });
    expect(Object.values(allowedMap(txt)).every(Boolean)).toBe(true);
    expect(txt).toContain("User-agent: OAI-SearchBot");
    expect(txt.endsWith("\n")).toBe(true);
  });

  it("search_only: search and user agents allowed, training blocked", () => {
    const parsed = allowedMap(buildRobotsTxt({ policy: "search_only" }));
    expect(parsed["oai-searchbot"]).toBe(true);
    expect(parsed["perplexitybot"]).toBe(true);
    expect(parsed["claude-searchbot"]).toBe(true);
    expect(parsed["chatgpt-user"]).toBe(true);
    for (const t of ["gptbot", "claudebot", "google-extended", "applebot-extended", "anthropic-ai", "cohere-ai"]) expect(parsed[t], t).toBe(false);
  });

  it("block_all blocks every AI crawler but leaves the wildcard open", () => {
    const txt = buildRobotsTxt({ policy: "block_all" });
    expect(Object.values(allowedMap(txt)).some(Boolean)).toBe(false);
    expect(txt).toMatch(/User-agent: \*\nAllow: \//);
  });

  it("custom policy honours each choice and defaults the rest to allow", () => {
    const parsed = allowedMap(buildRobotsTxt({ policy: "custom", custom: { gptbot: "block", perplexitybot: "block" } }));
    expect(parsed["gptbot"]).toBe(false);
    expect(parsed["perplexitybot"]).toBe(false);
    expect(parsed["oai-searchbot"]).toBe(true);
  });

  it("round-trips every policy for every crawler token", () => {
    for (const policy of ["open", "search_only", "block_all"] as const) {
      const expected = choicesFor(policy);
      const parsed = allowedMap(buildRobotsTxt({ policy }));
      for (const token of CRAWLER_TOKENS) expect(parsed[token], `${policy}/${token}`).toBe(expected[token] === "allow");
    }
  });

  it("adds disallow paths to the wildcard group, normalizes them, and adds the sitemap", () => {
    const txt = buildRobotsTxt({ policy: "open", disallowPaths: ["admin", "/cart", "  ", "bad path"], sitemapUrl: " https://x.test/sitemap.xml " });
    expect(txt).toContain("User-agent: *\nDisallow: /admin\nDisallow: /cart\n");
    expect(txt).not.toContain("bad path");
    expect(txt).toContain("Sitemap: https://x.test/sitemap.xml");
    expect(normalizePath("a/b")).toBe("/a/b");
    expect(normalizePath("")).toBeNull();
  });

  it("warns when search crawlers are blocked and when the sitemap is not a URL", () => {
    expect(robotsWarnings({ policy: "block_all" }).join(" ")).toContain("removes your site");
    expect(robotsWarnings({ policy: "search_only" })).toEqual([]);
    expect(robotsWarnings({ policy: "open", sitemapUrl: "sitemap.xml" }).join(" ")).toContain("full URL");
  });
});
