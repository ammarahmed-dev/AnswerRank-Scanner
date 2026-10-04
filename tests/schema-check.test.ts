import { describe, expect, it } from "vitest";
import { checkSchema } from "@/lib/schema-check";

const page = (...blocks: string[]) => `<html><head>${blocks.map((b) => `<script type="application/ld+json">${b}</script>`).join("")}</head><body></body></html>`;

describe("checkSchema", () => {
  it("reports no markup and suggests starting points", () => {
    const r = checkSchema("<html><body>hi</body></html>");
    expect(r.blocks).toEqual([]);
    expect(r.suggestions[0]).toContain("No JSON-LD");
  });

  it("flags blocks that are not valid JSON", () => {
    const r = checkSchema(page('{"@type": "Organization", "name": "Acme",}'));
    expect(r.blocks[0].valid).toBe(false);
    expect(r.blocks[0].error).toBeTruthy();
    expect(r.suggestions.join(" ")).toContain("fail to parse");
  });

  it("reads @graph and arrays and lists missing required and recommended properties", () => {
    const r = checkSchema(page(JSON.stringify({ "@context": "https://schema.org", "@graph": [
      { "@type": "Organization", name: "Acme", url: "https://acme.com" },
      { "@type": ["WebSite"], name: "Acme" },
      { "@type": "BlogPosting", headline: "Hello", datePublished: "2026-01-01" },
    ] })));
    expect(r.types).toEqual(["Organization", "WebSite", "BlogPosting"]);
    const org = r.entities.find((e) => e.type === "Organization")!;
    expect(org.missingRequired).toEqual([]);
    expect(org.missingRecommended).toEqual(["logo", "sameAs", "description"]);
    expect(r.entities.find((e) => e.type === "WebSite")!.missingRequired).toEqual(["url"]);
    const post = r.entities.find((e) => e.type === "BlogPosting")!;
    expect(post.missingRequired).toEqual(["author"]);
    expect(post.missingRecommended).toContain("dateModified");
  });

  it("validates FAQPage questions", () => {
    const good = checkSchema(page(JSON.stringify({ "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: "Q?", acceptedAnswer: { "@type": "Answer", text: "A" } }] })));
    expect(good.entities[0].missingRequired).toEqual([]);
    expect(good.suggestions.join(" ")).not.toContain("FAQPage");
    const bad = checkSchema(page(JSON.stringify({ "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: "Q?" }, { "@type": "Question", name: "Q2?", acceptedAnswer: { text: "A" } }] })));
    expect(bad.entities[0].missingRequired[0]).toContain("1 question");
    const empty = checkSchema(page(JSON.stringify({ "@type": "FAQPage" })));
    expect(empty.entities[0].missingRequired).toEqual(["mainEntity"]);
  });

  it("accepts full schema.org type URLs and subtype aliases, and passes unknown types through", () => {
    const r = checkSchema(page(JSON.stringify([{ "@type": "https://schema.org/Corporation", name: "Acme", url: "https://acme.com" }, { "@type": "Recipe", name: "Soup" }])));
    expect(r.types).toEqual(["Corporation", "Recipe"]);
    expect(r.entities[0].missingRequired).toEqual([]);
    expect(r.entities[1]).toEqual({ type: "Recipe", missingRequired: [], missingRecommended: [] });
  });

  it("suggests identity and FAQ markup when only a page type exists", () => {
    const r = checkSchema(page(JSON.stringify({ "@type": "WebPage", name: "Home", description: "d", isPartOf: {} })));
    const text = r.suggestions.join(" ");
    expect(text).toContain("Organization");
    expect(text).toContain("FAQPage");
  });

  it("counts a publisher or author declared inside an article as identity markup", () => {
    const r = checkSchema(page(JSON.stringify({ "@type": "BlogPosting", headline: "H", author: { "@type": "Person", name: "A" }, datePublished: "2026-01-01", publisher: { "@type": "Organization", name: "Acme" } })));
    expect(r.types).toEqual(["BlogPosting"]);
    expect(r.suggestions.join(" ")).not.toContain("Organization");
  });
});
