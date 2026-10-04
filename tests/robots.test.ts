import { describe, expect, it } from "vitest";
import { analyzeAiCrawlerAccess, describeAiCrawlerAccess, isRootAllowed, parseRobotsGroups } from "@/lib/robots";

const robots = (...lines: string[]) => lines.join("\n");

describe("robots.txt AI crawler access", () => {
  it("allows everything for an open robots.txt", () => {
    expect(analyzeAiCrawlerAccess(robots("User-agent: *", "Disallow:"))).toMatchObject({ status: "pass", blocked: [] });
  });

  it("detects crawlers blocked in a grouped user-agent block (old parser missed GPTBot)", () => {
    const r = analyzeAiCrawlerAccess(robots("User-agent: GPTBot", "User-agent: CCBot", "Disallow: /"));
    expect(r.blocked).toContain("gptbot");
    expect(r.status).toBe("warn"); // training-only block
  });

  it("fails when an AI search crawler is blocked", () => {
    const r = analyzeAiCrawlerAccess(robots("User-agent: OAI-SearchBot", "User-agent: PerplexityBot", "Disallow: /"));
    expect(r.status).toBe("fail");
    expect(r.detail).toContain("OAI-SearchBot");
  });

  it("treats a publisher that blocks training but allows search as a warning (NYT pattern)", () => {
    const r = analyzeAiCrawlerAccess(robots("User-agent: GPTBot", "Disallow: /", "", "User-agent: Google-Extended", "Disallow: /", "", "User-agent: *", "Allow: /"));
    expect(r.status).toBe("warn");
    expect(r.detail).toMatch(/training only/);
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

describe("describeAiCrawlerAccess", () => {
  const byToken = (rows: ReturnType<typeof describeAiCrawlerAccess>, token: string) => rows.find((r) => r.token === token)!;

  it("allows everything by default when there are no rules", () => {
    const rows = describeAiCrawlerAccess("");
    expect(rows.every((r) => r.allowed && r.source === "default")).toBe(true);
  });

  it("classifies search, training and user agents", () => {
    const rows = describeAiCrawlerAccess("");
    expect(byToken(rows, "oai-searchbot").kind).toBe("search");
    expect(byToken(rows, "gptbot").kind).toBe("training");
    expect(byToken(rows, "chatgpt-user").kind).toBe("user");
  });

  it("reports own-group vs wildcard decisions", () => {
    const rows = describeAiCrawlerAccess("User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n");
    expect(byToken(rows, "gptbot")).toMatchObject({ allowed: false, source: "own" });
    expect(byToken(rows, "perplexitybot")).toMatchObject({ allowed: true, source: "wildcard" });
  });

  it("applies a wildcard block to crawlers without their own group", () => {
    const rows = describeAiCrawlerAccess("User-agent: *\nDisallow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n");
    expect(byToken(rows, "oai-searchbot")).toMatchObject({ allowed: true, source: "own" });
    expect(byToken(rows, "claudebot")).toMatchObject({ allowed: false, source: "wildcard" });
  });
});
