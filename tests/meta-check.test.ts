import { describe, expect, it } from "vitest";
import { buildMetaReport, extractMeta } from "@/lib/meta-check";

const good = `<!doctype html><html lang="en"><head>
<title>Example Analytics - Product analytics for SaaS teams</title>
<meta name="Description" content="Example Analytics helps SaaS teams understand activation, retention and revenue with privacy-friendly product analytics. Start free today.">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="https://example.com/">
<meta property="og:title" content="Example Analytics"><meta property="og:description" content="Product analytics for SaaS teams">
<meta property="og:image" content="https://example.com/og.png"><meta property="og:url" content="https://example.com">
<meta name="twitter:card" content="summary_large_image">
</head><body><h1>Hi</h1></body></html>`;

const byId = (r: ReturnType<typeof buildMetaReport>) => Object.fromEntries(r.checks.map((c) => [c.id, c.status]));

describe("meta checker", () => {
  it("extracts values case-insensitively", () => {
    const v = extractMeta(good);
    expect(v.description).toContain("Example Analytics helps");
    expect(v.canonical).toBe("https://example.com/");
    expect(v.lang).toBe("en");
    expect(v.twitterCard).toBe("summary_large_image");
    expect(v.ogImage).toBe("https://example.com/og.png");
  });

  it("passes a well-formed head using the scanner's own grading", () => {
    const s = byId(buildMetaReport(good, "https://example.com/"));
    expect(s).toMatchObject({ title: "pass", meta_desc: "pass", canonical: "pass", og_tags: "pass", og_image: "pass", robots_meta: "pass", viewport: "pass", lang: "pass", twitter_card: "pass" });
    expect(s.og_url_match).toBeUndefined();
  });

  it("flags an empty head", () => {
    const s = byId(buildMetaReport("<html><head></head><body></body></html>", "https://example.com/"));
    expect(s.title).toBe("fail");
    expect(s.meta_desc).toBe("fail");
    expect(s.viewport).toBe("warn");
    expect(s.lang).toBe("warn");
    expect(s.twitter_card).toBe("warn");
  });

  it("fails a noindex page and warns on og:url mismatch", () => {
    const html = good.replace("</head>", '<meta name="robots" content="noindex, follow"></head>').replace('content="https://example.com"', 'content="https://other.example.com/x"');
    const report = buildMetaReport(html, "https://example.com/");
    expect(byId(report).robots_meta).toBe("fail");
    expect(byId(report).og_url_match).toBe("warn");
  });
});
