import { describe, expect, it } from "vitest";
import { testRobotsAccess } from "@/lib/robots";

const robots = (...lines: string[]) => lines.join("\n");

describe("testRobotsAccess", () => {
  it("allows everything when there are no rules", () => {
    expect(testRobotsAccess("", "googlebot", "/a")).toEqual({ allowed: true, rule: null, source: "none" });
  });

  it("applies the * group when the agent has no group of its own", () => {
    const r = testRobotsAccess(robots("User-agent: *", "Disallow: /private/"), "gptbot", "/private/x");
    expect(r).toMatchObject({ allowed: false, source: "wildcard", rule: { path: "/private/" } });
  });

  it("an agent's own group replaces the * group", () => {
    const body = robots("User-agent: *", "Disallow: /", "", "User-agent: Googlebot", "Disallow: /tmp/");
    expect(testRobotsAccess(body, "googlebot", "/page").allowed).toBe(true);
    expect(testRobotsAccess(body, "googlebot", "/tmp/a")).toMatchObject({ allowed: false, source: "own" });
    expect(testRobotsAccess(body, "bingbot", "/page").allowed).toBe(false);
  });

  it("longest match wins and Allow wins a tie", () => {
    const body = robots("User-agent: *", "Disallow: /docs/", "Allow: /docs/public/");
    expect(testRobotsAccess(body, "x", "/docs/public/a").allowed).toBe(true);
    expect(testRobotsAccess(body, "x", "/docs/secret").allowed).toBe(false);
    const tie = robots("User-agent: *", "Disallow: /a", "Allow: /a");
    expect(testRobotsAccess(tie, "x", "/a").allowed).toBe(true);
  });

  it("supports * wildcards and the $ end anchor", () => {
    const body = robots("User-agent: *", "Disallow: /*.pdf$", "Disallow: /*?session=");
    expect(testRobotsAccess(body, "x", "/files/a.pdf").allowed).toBe(false);
    expect(testRobotsAccess(body, "x", "/files/a.pdf?download=1").allowed).toBe(true);
    expect(testRobotsAccess(body, "x", "/p?session=1").allowed).toBe(false);
    expect(testRobotsAccess(body, "x", "/p").allowed).toBe(true);
  });

  it("treats regex characters in rules literally and is case-insensitive on the agent", () => {
    const body = robots("User-agent: GPTBot", "Disallow: /a.b+c");
    expect(testRobotsAccess(body, "GPTBot", "/a.b+c").allowed).toBe(false);
    expect(testRobotsAccess(body, "gptbot", "/axb+c").allowed).toBe(true);
  });
});
