import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { testRobotsAccess } from "@/lib/robots";

function publishedPolicy() {
  const policy = robots();
  const groups = Array.isArray(policy.rules) ? policy.rules : [policy.rules];
  return groups.map((group) => [
    ...[group.userAgent ?? "*"].flat().map((agent) => `User-agent: ${agent}`),
    ...[group.allow ?? []].flat().map((path) => `Allow: ${path}`),
    ...[group.disallow ?? []].flat().map((path) => `Disallow: ${path}`),
  ].join("\n")).join("\n\n");
}

const agents = ["Googlebot", "OAI-SearchBot", "GPTBot", "ChatGPT-User", "Google-Extended", "PerplexityBot", "ClaudeBot", "anthropic-ai"];

describe("published site crawl policy", () => {
  it.each(agents)("keeps existing excluded routes excluded for %s", (agent) => {
    const body = publishedPolicy();
    for (const path of ["/dashboard", "/dashboard/settings", "/report/example?share=synthetic", "/login?next=/dashboard", "/signup", "/api/scan", "/api/reports/example"]) {
      expect(testRobotsAccess(body, agent, path).allowed, `${agent}: ${path}`).toBe(false);
    }
  });

  it("uses the named group without relying on wildcard inheritance", () => {
    expect(testRobotsAccess(publishedPolicy(), "PerplexityBot", "/report/example")).toMatchObject({ allowed: false, source: "own" });
  });

  it("keeps every canonical sitemap page crawlable for search and named AI agents", async () => {
    const body = publishedPolicy();
    for (const entry of await sitemap()) {
      const path = new URL(entry.url).pathname;
      for (const agent of agents) {
        expect(testRobotsAccess(body, agent, path).allowed, `${agent}: ${path}`).toBe(true);
      }
    }
    expect(robots().sitemap).toBe("https://www.aeocheck.co/sitemap.xml");
  });
});
