import { describe, expect, it } from "vitest";
import { analyzeUrlset, isValidLastmod, parseSitemap, sitemapsFromRobots } from "@/lib/sitemap-check";

const urlset = (urls: string) => `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
const now = new Date("2026-10-04T00:00:00Z");

describe("parseSitemap", () => {
  it("reads urlset entries with and without lastmod", () => {
    const r = parseSitemap(urlset("<url><loc> https://a.test/ </loc><lastmod>2026-09-01</lastmod></url><url><loc>https://a.test/b</loc></url>"));
    expect(r).toEqual({ kind: "urlset", entries: [{ loc: "https://a.test/", lastmod: "2026-09-01" }, { loc: "https://a.test/b" }] });
  });

  it("reads a sitemap index", () => {
    const r = parseSitemap('<?xml version="1.0"?><sitemapindex xmlns="x"><sitemap><loc>https://a.test/s1.xml</loc></sitemap><sitemap><loc>https://a.test/s2.xml</loc></sitemap></sitemapindex>');
    expect(r).toEqual({ kind: "index", children: ["https://a.test/s1.xml", "https://a.test/s2.xml"] });
  });

  it("rejects empty files, HTML pages and non-sitemap XML", () => {
    expect(parseSitemap("").kind).toBe("invalid");
    expect(parseSitemap("<!DOCTYPE html><html><body>404</body></html>")).toMatchObject({ kind: "invalid", reason: expect.stringContaining("HTML") });
    expect(parseSitemap("<rss><channel/></rss>")).toMatchObject({ kind: "invalid", reason: expect.stringContaining("urlset") });
  });

  it("tolerates a byte order mark", () => {
    expect(parseSitemap("﻿" + urlset("<url><loc>https://a.test/</loc></url>")).kind).toBe("urlset");
  });
});

describe("isValidLastmod", () => {
  it("accepts W3C date forms and rejects others", () => {
    for (const ok of ["2026", "2026-09", "2026-09-30", "2026-09-30T10:00:00Z", "2026-09-30T10:00:00+02:00", "2026-09-30T10:00:00.123Z"]) expect(isValidLastmod(ok), ok).toBe(true);
    for (const bad of ["09/30/2026", "yesterday", "2026-13-40", "2026-9-3", ""]) expect(isValidLastmod(bad), bad).toBe(false);
  });
});

describe("analyzeUrlset", () => {
  const msgs = (a: ReturnType<typeof analyzeUrlset>) => a.issues.map((i) => i.message).join(" | ");

  it("is clean for a healthy sitemap", () => {
    const a = analyzeUrlset([{ loc: "https://a.test/", lastmod: "2026-09-30" }, { loc: "https://a.test/b", lastmod: "2026-09-01" }], "https://www.a.test", now);
    expect(a.issues).toEqual([]);
    expect(a.urlCount).toBe(2);
    expect(a.sample).toEqual(["https://a.test/", "https://a.test/b"]);
  });

  it("flags duplicates, foreign hosts, http, queries and invalid URLs", () => {
    const a = analyzeUrlset(
      [{ loc: "https://a.test/" }, { loc: "https://a.test/" }, { loc: "https://other.test/x" }, { loc: "http://a.test/old" }, { loc: "https://a.test/p?utm=1" }, { loc: "/relative" }],
      "https://a.test", now
    );
    const text = msgs(a);
    expect(text).toContain("1 duplicate URL");
    expect(text).toContain("different domain");
    expect(text).toContain("http://");
    expect(text).toContain("query parameters");
    expect(text).toContain("not valid absolute URLs");
    expect(a.sample).not.toContain("/relative");
  });

  it("flags lastmod problems: invalid, missing, identical, stale and future", () => {
    expect(msgs(analyzeUrlset([{ loc: "https://a.test/", lastmod: "tomorrow" }], "https://a.test", now))).toContain("not a valid date");
    expect(msgs(analyzeUrlset([{ loc: "https://a.test/" }], "https://a.test", now))).toContain("No URLs have a lastmod");
    expect(msgs(analyzeUrlset([{ loc: "https://a.test/", lastmod: "2026-09-01" }, { loc: "https://a.test/b" }], "https://a.test", now))).toContain("1 of 2 URLs have no lastmod");
    expect(msgs(analyzeUrlset([{ loc: "https://a.test/", lastmod: "2026-09-01" }, { loc: "https://a.test/b", lastmod: "2026-09-01" }], "https://a.test", now))).toContain("identical");
    expect(msgs(analyzeUrlset([{ loc: "https://a.test/", lastmod: "2024-01-01" }], "https://a.test", now))).toContain("over a year old");
    expect(msgs(analyzeUrlset([{ loc: "https://a.test/", lastmod: "2027-01-01" }], "https://a.test", now))).toContain("future");
  });

  it("flags empty and oversized sitemaps as errors", () => {
    expect(analyzeUrlset([], "https://a.test", now).issues[0]).toMatchObject({ level: "error" });
    const big = Array.from({ length: 50_001 }, (_, i) => ({ loc: `https://a.test/${i}` }));
    expect(analyzeUrlset(big, "https://a.test", now).issues.some((i) => i.level === "error" && i.message.includes("50,000"))).toBe(true);
  });
});

describe("sitemapsFromRobots", () => {
  it("finds Sitemap directives case-insensitively", () => {
    expect(sitemapsFromRobots("User-agent: *\nAllow: /\nSitemap: https://a.test/s.xml\nsitemap:https://a.test/t.xml\n")).toEqual(["https://a.test/s.xml", "https://a.test/t.xml"]);
    expect(sitemapsFromRobots("User-agent: *")).toEqual([]);
  });
});
