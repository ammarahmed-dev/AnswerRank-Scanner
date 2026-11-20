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

  it.each([
    ['<meta name="robots" content="index,follow"><meta name="robots" content="noindex">', 'generic robots'],
    ['<meta name="robots" content="noindex"><meta name="robots" content="index">', 'generic robots'],
    ['<meta name="robots"><meta name="ROBOTS" content="NONE">', 'generic robots'],
    ['<meta name="robots" content="index"><meta name="googlebot" content="noindex">', 'Googlebot'],
    ['<meta name="GoogleBot" content="index"><meta name="GOOGLEBOT" content="None">', 'Googlebot'],
    ['<meta name="googlebot" content="noindex"><meta name="robots" content="all">', 'Googlebot'],
    ['<meta name="robots" content="INDEX NOINDEX FOLLOW">', 'generic robots'],
  ])("detects restrictive matching tags regardless of earlier/later index: %s", (tags, scope) => {
    const report = buildMetaReport(good.replace('</head>', `${tags}</head>`), 'https://example.com/');
    const check = report.checks.find(c => c.id === 'robots_meta')!;
    expect(check.status).toBe('fail');
    expect(check.detail).toContain(scope);
    expect(check.detail).not.toMatch(/search and AI engines/);
    // Additional tool-only diagnostics must not alter the shared scanner grades.
    expect(report.checks.filter(c => ['title', 'meta_desc', 'canonical', 'og_tags', 'og_image'].includes(c.id)))
      .toEqual(buildMetaReport(good, 'https://example.com/').checks.filter(c => ['title', 'meta_desc', 'canonical', 'og_tags', 'og_image'].includes(c.id)));
  });

  it.each(['', 'index, follow', 'max-image-preview:none', 'max-image-preview: none', 'noimageindex, nosnippet', 'max-snippet:0', 'indexifembedded'])('does not mistake %j for a page noindex or promise indexability', content => {
    const report = buildMetaReport(good.replace('</head>', `<meta name="robots" content="${content}"></head>`), 'https://example.com/');
    const check = report.checks.find(c => c.id === 'robots_meta')!;
    expect(check.status).toBe('pass');
    expect(check.detail).toContain('not confirmation that the page can be indexed');
    expect(check.detail).not.toContain('allows indexing');
  });

  it('retains all matching values and distinguishes Googlebot from other crawler targets', () => {
    const tags = '<meta name="robots" content="index"><meta name="ROBOTS" content="follow"><meta name="googlebot" content="max-snippet:20"><meta name="googlebot-news" content="noindex"><meta name="otherbot" content="noindex">';
    const report = buildMetaReport(good.replace('</head>', `${tags}</head>`), 'https://example.com/');
    expect(report.values.robots).toBe('index, follow');
    expect(report.values.googlebotRobots).toBe('max-snippet:20');
    expect(byId(report).robots_meta).toBe('pass');
  });

  it('reads a matching tag in the body, including case and whitespace', () => {
    const report = buildMetaReport(good.replace('</body>', '<meta name="Googlebot" content="  NoInDeX , follow  "></body>'), 'https://example.com/');
    expect(byId(report).robots_meta).toBe('fail');
  });

});
