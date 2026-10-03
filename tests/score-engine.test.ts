import { describe, expect, it } from "vitest";
import { calculateScore, runDeterministicChecks } from "@/lib/score-engine";
import type { ScrapedData } from "@/types/index";

const strongPage: ScrapedData = {
  url: "https://example.com/",
  title: "Example Analytics - Product analytics for SaaS teams",
  metaDescription:
    "Example Analytics helps SaaS teams understand activation, retention and revenue with privacy-friendly product analytics. Start free today.",
  canonical: "https://example.com/",
  headings: [
    "H1: Product analytics for SaaS teams",
    "H2: What is Example Analytics?",
    "H2: How does it work?",
    "H2: Who is it for?",
    "H3: Pricing",
    "H2: Frequently asked questions",
  ],
  schemaTypes: ["Organization", "WebSite", "FAQPage", "SoftwareApplication"],
  schemaBlocks: 3,
  bodyText: "Example Analytics is a product analytics platform. ".repeat(120),
  images: [{ hasAlt: true }, { hasAlt: true }],
  internalLinks: 25,
  wordCount: 900,
  ogTitle: "Example Analytics",
  ogDescription: "Product analytics for SaaS teams",
  ogImage: "https://example.com/og.png",
  hasAuthor: true,
  hasAboutPage: true,
  hasContactPage: true,
  datePublished: "2026-01-01",
  dateModified: "2026-09-01",
  readabilityScore: 65,
};

const weakPage: ScrapedData = {
  url: "https://example.org/",
  title: "",
  metaDescription: "",
  canonical: "",
  headings: [],
  schemaTypes: [],
  schemaBlocks: 0,
  bodyText: "Welcome",
  images: [{ hasAlt: false }, { hasAlt: false }],
  internalLinks: 0,
  wordCount: 1,
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
};

describe("score engine", () => {
  it("produces checks with unique ids and valid statuses", () => {
    const checks = runDeterministicChecks(strongPage);
    expect(checks.length).toBeGreaterThan(5);
    expect(new Set(checks.map((c) => c.id)).size).toBe(checks.length);
    for (const check of checks) expect(["pass", "warn", "fail"]).toContain(check.status);
  });

  it("keeps scores within 0-100", () => {
    for (const page of [strongPage, weakPage]) {
      const score = calculateScore(runDeterministicChecks(page));
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("scores a well-optimized page above a bare one", () => {
    const strong = calculateScore(runDeterministicChecks(strongPage));
    const weak = calculateScore(runDeterministicChecks(weakPage));
    expect(strong).toBeGreaterThan(weak + 20);
  });

  it("flags a missing title and meta description", () => {
    const checks = runDeterministicChecks(weakPage);
    expect(checks.find((c) => c.id === "title")?.status).not.toBe("pass");
    expect(checks.find((c) => c.id === "meta_desc")?.status).not.toBe("pass");
  });
});
