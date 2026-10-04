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

  it("runs 25 checks (the number the marketing copy promises)", () => {
    expect(runDeterministicChecks(strongPage)).toHaveLength(25); // scan-core only overrides statuses, it adds none
  });

  it("scores canonical URLs", () => {
    const status = (canonical: string) => runDeterministicChecks({ ...strongPage, canonical }).find((c) => c.id === "canonical")?.status;
    expect(status("https://example.com/")).toBe("pass");
    expect(status("/")).toBe("pass");
    expect(status("https://www.example.com/")).toBe("pass");
    expect(status("https://other.com/")).toBe("warn");
    expect(status("")).toBe("fail");
  });

  it("scores question-style headings", () => {
    const status = (headings: string[]) => runDeterministicChecks({ ...strongPage, headings }).find((c) => c.id === "qa_structure")?.status;
    expect(status(["H1: Analytics", "H2: What is Example?", "H3: How much does it cost"])).toBe("pass");
    expect(status(["H1: Analytics", "H2: Why teams switch?"])).toBe("warn");
    expect(status(["H1: What is Example?", "H2: Features", "H2: Pricing"])).toBe("fail");
  });

  it("flags a missing title and meta description", () => {
    const checks = runDeterministicChecks(weakPage);
    expect(checks.find((c) => c.id === "title")?.status).not.toBe("pass");
    expect(checks.find((c) => c.id === "meta_desc")?.status).not.toBe("pass");
  });
});

describe("reader fallback", () => {
  const readerPage: ScrapedData = { ...weakPage, title: "Example Analytics - Product analytics for SaaS", bodyText: "Example Analytics is a product analytics platform. ".repeat(80), wordCount: 480, headings: ["H1: Product analytics", "H2: What is it?", "H2: How does it work?"], source: "reader" };

  it("marks HTML-only signals as not verified instead of failing them", () => {
    const checks = runDeterministicChecks(readerPage);
    for (const id of ["meta_desc", "schema_present", "og_tags", "canonical", "alt_text"]) {
      const check = checks.find((c) => c.id === id);
      expect(check?.status, id).toBe("warn");
      expect(check?.detail, id).toMatch(/Not verified/);
    }
  });

  it("still scores text signals normally", () => {
    const checks = runDeterministicChecks(readerPage);
    expect(checks.find((c) => c.id === "title")?.status).toBe("pass");
    expect(checks.find((c) => c.id === "qa_structure")?.status).toBe("pass");
  });

  it("scores a blocked page higher than the same data treated as real HTML", () => {
    const limited = calculateScore(runDeterministicChecks(readerPage));
    const asHtml = calculateScore(runDeterministicChecks({ ...readerPage, source: "html" }));
    expect(limited).toBeGreaterThan(asHtml);
  });
});

describe("reader text parsing", () => {
  it("parses reader markdown into scraped data marked as reader source", async () => {
    const { parseReaderTextToScrapedData } = await import("@/lib/scrape");
    const text = ["Title: Stripe | Payments", "", "URL Source: https://stripe.com/", "", "Markdown Content:", "## What is Stripe?", "Stripe is a payments platform used by millions of businesses to accept payments online and in person."].join("\n");
    const data = parseReaderTextToScrapedData(text, "https://stripe.com/");
    expect(data.source).toBe("reader");
    expect(data.title).toBe("Stripe | Payments");
    expect(data.headings).toContain("H2: What is Stripe?");
    expect(data.wordCount).toBeGreaterThan(10);
    expect(typeof data.readabilityScore).toBe("number");
  });
});

describe("title length grading", () => {
  const status = (title: string) => runDeterministicChecks({ ...strongPage, title }).find((c) => c.id === "title")?.status;

  it("passes 30-60, warns 20-90, fails brand-only, missing or extreme titles", () => {
    expect(status("x".repeat(45))).toBe("pass");
    expect(status("x".repeat(75))).toBe("warn");
    expect(status("x".repeat(90))).toBe("warn");
    expect(status("x".repeat(91))).toBe("fail");
    expect(status("Apple")).toBe("fail");
    expect(status("")).toBe("fail");
  });
});

describe("meta description handling", () => {
  const status = (description: string) =>
    runDeterministicChecks({ ...strongPage, metaDescription: description }).find((c) => c.id === "meta_desc")?.status;

  it("grades description length: pass 120-160, warn 30-250, fail otherwise", () => {
    expect(status("x".repeat(140))).toBe("pass");
    expect(status("x".repeat(47))).toBe("warn");
    expect(status("x".repeat(30))).toBe("warn");
    expect(status("x".repeat(119))).toBe("warn");
    expect(status("x".repeat(250))).toBe("warn");
    expect(status("x".repeat(29))).toBe("fail");
    expect(status("x".repeat(251))).toBe("fail");
    expect(status("")).toBe("fail");
  });

  it("reads meta tags regardless of attribute value case and og tags declared with name=", async () => {
    const { parseHtmlToScrapedData } = await import("@/lib/scrape");
    const html = `<html><head><title>T</title><meta name="Description" content="Mixed case description"><meta name="og:title" content="OG by name"><meta property="OG:Image" content="https://x.test/i.png"></head><body><h1>Hi</h1></body></html>`;
    const data = parseHtmlToScrapedData(html, "https://x.test/");
    expect(data.metaDescription).toBe("Mixed case description");
    expect(data.ogTitle).toBe("OG by name");
    expect(data.ogImage).toBe("https://x.test/i.png");
  });
});

describe("text extraction from minified HTML", () => {
  it("keeps words from adjacent elements apart and scores readability on prose", async () => {
    const { parseHtmlToScrapedData } = await import("@/lib/scrape");
    const html =
      "<html><body><main><h2>Our product</h2>" +
      "<p>We help small teams ship better software every single week.</p>" +
      "<p>Our dashboard shows what changed and why it matters to your customers.</p>" +
      "<p>Setup takes five minutes and needs no code from your engineers at all.</p>" +
      "<ul><li>Fast</li><li>Simple</li></ul>" +
      "<div><a>Home</a><a>Pricing</a><a>Docs</a></div></main></body></html>";
    const data = parseHtmlToScrapedData(html, "https://x.test/");
    expect(data.bodyText).toContain("Our product We help");
    expect(data.bodyText).toContain("week. Our dashboard");
    expect(data.bodyText).toContain("Fast Simple");
    expect(data.wordCount).toBeGreaterThanOrEqual(35);
    // Three plain-English sentences are easy to read (Flesch above 60), not "0".
    expect(data.readabilityScore).toBeGreaterThanOrEqual(60);
  });

  it("does not compute readability when there is almost no prose", async () => {
    const { parseHtmlToScrapedData } = await import("@/lib/scrape");
    const data = parseHtmlToScrapedData("<html><body><nav>x</nav><main><h1>Hi</h1><button>Go</button></main></body></html>", "https://x.test/");
    expect(data.readabilityScore).toBeUndefined();
  });
});

describe("image alt handling", () => {
  it("treats alt='' and presentational images as decorative, and only a missing alt as a problem", async () => {
    const { parseHtmlToScrapedData } = await import("@/lib/scrape");
    const html = `<html><body><main>
      <img src="a.png" alt="A chart of monthly revenue">
      <img src="b.png" alt="">
      <img src="c.png" role="presentation">
      <img src="d.png" aria-hidden="true">
      <img src="e.png">
    </main></body></html>`;
    const data = parseHtmlToScrapedData(html, "https://x.test/");
    expect(data.images.map((i) => i.hasAlt)).toEqual([true, true, true, true, false]);
  });
});
