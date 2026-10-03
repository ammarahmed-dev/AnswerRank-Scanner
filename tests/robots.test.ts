import { describe, expect, it } from "vitest";
import { analyzeAiCrawlerAccess, isRootAllowed, parseRobotsGroups } from "@/lib/robots";

const robots = (...lines: string[]) => lines.join("\n");

describe("robots.txt AI crawler access", () => {
  it("allows everything for an open robots.txt", () => {
    expect(analyzeAiCrawlerAccess(robots("User-agent: *", "Disallow:"))).toMatchObject({ status: "pass", blocked: [] });
  });

  it("detects crawlers blocked in a grouped user-agent block (old parser missed GPTBot)", () => {
    const r = analyzeAiCrawlerAccess(robots("User-agent: GPTBot", "User-agent: CCBot", "Disallow: /"));
    expect(r.blocked).toContain("gptbot");
    expect(r.status).toBe("fail");
  });

  it("uses the real Google-Extended token", () => {
    const r = analyzeAiCrawlerAccess(robots("User-agent: Google-Extended", "Disallow: /"));
    expect(r).toMatchObject({ status: "warn", blocked: ["google-extended"] });
    expect(r.detail).toContain("Google-Extended");
  });

  it("treats a wildcard block as blocking AI crawlers without their own group", () => {
    const r = analyzeAiCrawlerAccess(robots("User-agent: *", "Disallow: /"));
    expect(r.status).toBe("fail");
    expect(r.detail).toMatch(/all AI crawlers/);
  });

  it("lets a crawler's own group override a wildcard block", () => {
    const groups = parseRobotsGroups(robots("User-agent: *", "Disallow: /", "", "User-agent: GPTBot", "Allow: /"));
    expect(isRootAllowed(groups, "gptbot")).toBe(true);
    expect(isRootAllowed(groups, "claudebot")).toBe(false);
  });

  it("ignores path-specific rules and comments", () => {
    const r = analyzeAiCrawlerAccess(robots("# AI policy", "User-agent: GPTBot # openai", "Disallow: /private/", "Disallow: /admin"));
    expect(r.status).toBe("pass");
    expect(r.detail).toMatch(/explicitly allowed/);
  });

  it("prefers Allow on equal-length rules", () => {
    const groups = parseRobotsGroups(robots("User-agent: PerplexityBot", "Disallow: /", "Allow: /"));
    expect(isRootAllowed(groups, "perplexitybot")).toBe(true);
  });
});
