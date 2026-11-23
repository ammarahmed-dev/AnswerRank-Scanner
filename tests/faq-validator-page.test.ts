import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/app/components/SiteHeader", () => ({ default: () => null }));
vi.mock("@/app/components/SiteFooter", () => ({ default: () => null }));
vi.mock("@/app/components/ServiceCta", () => ({ default: () => null }));
vi.mock("@/app/tools/schema-checker/SchemaChecker", () => ({ default: () => null }));
import Page, { metadata } from "@/app/tools/faq-schema-validator/page";
import { checkSchema } from "@/lib/schema-check";

const html = renderToStaticMarkup(createElement(Page));
const $ = load(html);
describe("published FAQ validation guide", () => {
  it("publishes a parseable example that agrees with its visible worked question and answer", () => {
    const code = $('pre[aria-label="Illustrative FAQPage JSON-LD"]').text();
    const result = checkSchema(code);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].valid).toBe(true);
    expect(result.entities).toMatchObject([{ type: "FAQPage", rulesChecked: true, missingRequired: [] }]);
    const example = JSON.parse(load(code)('script').text());
    expect(example.mainEntity[0]['@type']).toBe('Question');
    expect(example.mainEntity[0].acceptedAnswer['@type']).toBe('Answer');
    expect(example.mainEntity[0].name).toBe($('.faq-worked-copy h3').text());
    expect(example.mainEntity[0].acceptedAnswer.text).toBe($('.faq-worked-copy p').text());
  });
  it("keeps the example inert and its own FAQ structured data consistent with visible answers", () => {
    expect($('script[type="application/ld+json"]')).toHaveLength(1);
    const schema = JSON.parse($('script[type="application/ld+json"]').text());
    const faq = schema.find((node: { '@type': string }) => node['@type'] === 'FAQPage');
    for (const q of faq.mainEntity) {
      expect($('.llms-tool-faq h3').map((_, el) => $(el).text()).get()).toContain(q.name);
      expect($('.llms-tool-faq p').map((_, el) => $(el).text()).get()).toContain(q.acceptedAnswer.text);
    }
    expect(checkSchema(html).blocks[0].valid).toBe(true);
  });
  it("preserves title/canonical and provides distinct build, validate and scan paths", () => {
    expect(metadata.title).toContain('Free FAQ Schema Checker & Validator');
    expect(metadata.alternates?.canonical).toBe('https://www.aeocheck.co/tools/faq-schema-validator');
    for (const href of ['/tools/faq-schema-generator', 'https://validator.schema.org/', '/#scanner', '/blog/how-to-check-schema-markup']) expect($(`a[href="${href}"]`).length).toBeGreaterThan(0);
    expect($('#faq-next-heading').text()).toBe('What should I fix after a FAQ schema check?');
  });
});
