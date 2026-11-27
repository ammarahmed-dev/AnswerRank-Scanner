import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/app/components/SiteHeader", () => ({ default: () => null }));
vi.mock("@/app/components/SiteFooter", () => ({ default: () => null }));
vi.mock("@/app/components/ServiceCta", () => ({ default: () => null }));
vi.mock("@/app/tools/ai-crawler-checker/AiCrawlerChecker", () => ({ default: () => null }));
import Page, { metadata } from "@/app/tools/ai-crawler-checker/page";
import { testRobotsAccess } from "@/lib/robots";

const html = renderToStaticMarkup(createElement(Page));
const $ = load(html);
const policy = $('pre[aria-label="Illustrative search and training robots policy"]').text();
describe("published crawler repair guidance", () => {
  it("matches every published example outcome using the real robots matcher", () => {
    const cases = $('ul[aria-label="Expected example policy findings"] li');
    expect(cases).toHaveLength(4);
    cases.each((_, el) => {
      const row = $(el);
      const result = testRobotsAccess(policy, row.attr('data-agent')!, row.attr('data-path')!);
      expect(result.allowed).toBe(row.attr('data-allowed') === 'true');
      expect(row.text()).toContain(result.allowed ? 'allowed by these rules' : 'disallowed by these rules');
    });
    expect(testRobotsAccess(policy, 'OAI-SearchBot', '/products/lamp').source).toBe('own');
    expect(testRobotsAccess(policy, 'PerplexityBot', '/api/orders').source).toBe('wildcard');
  });
  it("retains private-path exclusions in both named and fallback policy groups", () => {
    expect(policy).toContain('User-agent: OAI-SearchBot');
    for (const agent of ['OAI-SearchBot', 'GPTBot', 'PerplexityBot', 'Googlebot']) {
      for (const path of ['/private/draft', '/api/orders']) expect(testRobotsAccess(policy, agent, path).allowed).toBe(false);
    }
    expect(testRobotsAccess(policy, 'GPTBot', '/products/lamp').allowed).toBe(false);
    expect(testRobotsAccess(policy, 'OAI-SearchBot', '/products/lamp').allowed).toBe(true);
    expect($('#crawler-example-heading').parent().text()).toContain('do not replace your file');
    expect($('#crawler-example-heading').parent().text()).toContain('not authentication');
  });
  it("keeps structured FAQ answers consistent, example inert and existing discovery intact", () => {
    expect($('script[type="application/ld+json"]')).toHaveLength(1);
    const schemas = JSON.parse($('script[type="application/ld+json"]').text());
    for (const q of schemas.find((n: { '@type': string }) => n['@type'] === 'FAQPage').mainEntity) {
      expect($('.llms-tool-faq h3').map((_, el) => $(el).text()).get()).toContain(q.name);
      expect($('.llms-tool-faq p').map((_, el) => $(el).text()).get()).toContain(q.acceptedAnswer.text);
    }
    for (const href of ['/#scanner', '/sample-report', '/blog/robots-txt-ai-crawlers', '/blog/technical-aeo-guide', 'https://developers.openai.com/api/docs/bots', 'https://www.rfc-editor.org/rfc/rfc9309.html#section-3']) expect($(`a[href="${href}"]`).length).toBeGreaterThan(0);
    expect(metadata.title).toContain('Free AI Crawler Checker: Is GPTBot Blocked?');
    expect(metadata.alternates?.canonical).toBe('https://www.aeocheck.co/tools/ai-crawler-checker');
    expect($('#crawler-repair-heading').parent().text()).toContain('unavailable fetch is unknown');
    expect($('#crawler-repair-heading').parent().text()).toContain('copied User-Agent does not prove');
  });
});
