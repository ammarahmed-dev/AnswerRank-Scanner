import { describe, expect, it } from "vitest";
import { checkSchema, type SchemaCheckResult } from "@/lib/schema-check";
import { schemaCheckSummary } from "@/lib/schema-check-summary";

const page = (...values: unknown[]) => values.map(value => `<script type="application/ld+json">${JSON.stringify(value)}</script>`).join("");
const org = { "@type": "Organization", name: "Example", url: "https://example.test", logo: "logo.png", description: "Example publisher", sameAs: ["https://example.test/about"] };

describe("schema check coverage", () => {
  it.each(["Recipe", "Event", "MadeUpType", "constructor", "__proto__", "toString"])("keeps %s unassessed without inventing a pass or parse failure", type => {
    const result = checkSchema(page({ "@type": type }));
    expect(result.blocks).toEqual([{ index: 1, valid: true, types: [type] }]);
    expect(result.entities).toEqual([{ type, source: { block: 1, pointer: "" }, rulesChecked: false, missingRequired: [], missingRecommended: [] }]);
    expect(schemaCheckSummary(result)).toMatchObject({ tone: "warn", title: "Types detected; field checks unavailable", checked: 0, unassessed: 1 });
  });

  it.each([null, 42, "text", [], {}, { "@id": "#untyped" }, { "@graph": [] }])("distinguishes parseable JSON %j from assessed typed entities", value => {
    const result = checkSchema(page(value));
    expect(result.blocks[0].valid).toBe(true);
    expect(schemaCheckSummary(result)).toEqual({ tone: "warn", title: "JSON parsed; no typed entities found", checked: 0, unassessed: 0 });
  });

  it("does not claim all structured data is absent when only JSON-LD is missing", () => {
    const result = checkSchema('<div itemscope itemtype="https://schema.org/Organization"><span itemprop="name">Example</span></div>');
    expect(schemaCheckSummary(result)).toEqual({ tone: "warn", title: "No JSON-LD blocks found", checked: 0, unassessed: 0 });
  });

  it("warns about unassessed types alongside a checked declaration", () => {
    const result = checkSchema(page({ "@graph": [org, { "@type": "Recipe", name: "Soup" }] }));
    expect(result.entities.map(entity => entity.rulesChecked)).toEqual([true, false]);
    expect(schemaCheckSummary(result)).toEqual({ tone: "warn", title: "Checked fields present; some types unassessed", checked: 1, unassessed: 1 });
  });

  it("counts extracted top-level and graph type declarations without implying nested coverage", () => {
    const result = checkSchema(page({ "@graph": [{ ...org, founder: { "@type": "Person" } }, { "@type": "Recipe", author: { "@type": "Person" } }] }));
    expect(result.types).toEqual(["Organization", "Recipe"]);
    expect(result.entities.map(entity => entity.type)).toEqual(["Organization", "Recipe"]);
    expect(schemaCheckSummary(result)).toMatchObject({ checked: 1, unassessed: 1 });
  });

  it("applies the parent checklist to full schema.org URL aliases", () => {
    const result = checkSchema(page({ ...org, "@type": "https://schema.org/Corporation" }));
    expect(result.entities[0].rulesChecked).toBe(true);
    expect(schemaCheckSummary(result)).toEqual({ tone: "good", title: "Checked fields present", checked: 1, unassessed: 0 });
  });

  it("warns about missing checked fields while retaining optional review suggestions", () => {
    const result = checkSchema(page({ "@type": "Organization", name: "Example" }));
    expect(result.entities[0]).toMatchObject({ rulesChecked: true, missingRequired: ["url"], missingRecommended: ["logo", "sameAs", "description"] });
    expect(schemaCheckSummary(result)).toMatchObject({ tone: "warn", title: "Checked fields need review", checked: 1 });
  });

  it("preserves parseable declarations alongside syntax errors", () => {
    const result = checkSchema(page(org) + '<script type="application/ld+json">{"@type":</script>');
    expect(result.blocks.map(block => block.valid)).toEqual([true, false]);
    expect(result.entities[0].rulesChecked).toBe(true);
    expect(schemaCheckSummary(result)).toMatchObject({ tone: "bad", title: "JSON-LD syntax errors found", checked: 1 });
  });

  it("treats older responses without explicit coverage as unassessed", () => {
    const result: SchemaCheckResult = { blocks: [{ index: 1, valid: true, types: ["Organization"] }], entities: [{ type: "Organization", missingRequired: [], missingRecommended: [] }], types: ["Organization"], suggestions: [] };
    expect(schemaCheckSummary(result)).toMatchObject({ tone: "warn", checked: 0, unassessed: 1 });
  });
});
