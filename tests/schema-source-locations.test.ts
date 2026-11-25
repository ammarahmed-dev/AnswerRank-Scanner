import { describe, expect, it, vi } from "vitest";
import { checkSchema } from "@/lib/schema-check";
vi.mock("@/lib/auth-server", () => ({ getAuthContext: vi.fn().mockResolvedValue({ user: null, plan: "free" }) }));
vi.mock("@/lib/usage-limits", () => ({ reserveUsage: vi.fn().mockResolvedValue({ allowed: true, reserved: true }), commitUsage: vi.fn(), releaseUsage: vi.fn(), getClientKey: () => "fixture" }));
vi.mock("@/lib/scrape", async (original) => ({ ...await original<typeof import("@/lib/scrape")>(), fetchHtml: vi.fn() }));
vi.mock("@/lib/url-safety", async (original) => ({ ...await original<typeof import("@/lib/url-safety")>(), assertPublicUrl: vi.fn().mockResolvedValue(undefined) }));
const script = (value: unknown) => `<script type="application/ld+json">${JSON.stringify(value)}</script>`;
const org = { "@type": "Organization", name: "Example", url: "https://example.invalid" };
function resolve(value: unknown, pointer: string): unknown {
  return pointer.split("/").slice(1).reduce<unknown>((node, token) => (node as Record<string, unknown>)[token], value);
}
describe("schema finding source locations", () => {
  it("identifies the root in each JSON-LD script without counting unrelated scripts", () => {
    const result = checkSchema(`<script>window.test = true;</script>${script(org)}${script({ ...org, name: "Second" })}`);
    expect(result.entities.map(e => e.source)).toEqual([{ block: 1, pointer: "" }, { block: 2, pointer: "" }]);
  });
  it("resolves every returned declaration to its original array/@graph node, preserving order and multi-types", () => {
    const value = [{ "@type": "WebPage", name: "Page", "@graph": [org, { "@type": ["Recipe", "Product"], name: "Item" }] }, org];
    const result = checkSchema(script(value));
    expect(result.entities.map(e => [e.type, e.source?.pointer])).toEqual([
      ["Organization", "/0/@graph/0"], ["Recipe", "/0/@graph/1"], ["Product", "/0/@graph/1"], ["WebPage", "/0"], ["Organization", "/1"],
    ]);
    for (const entity of result.entities) {
      expect(entity.source?.block).toBe(1);
      const node = resolve(value, entity.source!.pointer!) as Record<string, unknown>;
      expect([node["@type"]].flat()).toContain(entity.type);
    }
  });
  it("retains original block numbering after syntax errors or untyped blocks", () => {
    const result = checkSchema(`<script type="application/ld+json">{broken}</script>${script({ name: "Untyped" })}${script(org)}`);
    expect(result.blocks.map(b => [b.index, b.valid])).toEqual([[1, false], [2, true], [3, true]]);
    expect(result.entities[0].source).toEqual({ block: 3, pointer: "" });
  });
  it("preserves extraction boundaries and locates FAQ declarations rather than inventing nested coverage", () => {
    const faq = { "@type": "FAQPage", mainEntity: [{ name: "Question?", acceptedAnswer: { text: "Answer" } }] };
    const result = checkSchema(script({ "@graph": [faq, { "@type": "Article", author: org }] }));
    expect(result.entities.map(e => [e.type, e.source?.pointer])).toEqual([["FAQPage", "/@graph/0"], ["Article", "/@graph/1"]]);
    expect(result.entities[0].missingRequired).toEqual([]);
    expect(result.entities[1].missingRequired).toEqual(["headline", "datePublished"]);
  });
  it("does not trust page-supplied source metadata", () => {
    expect(checkSchema(script({ ...org, source: { block: 99, pointer: "/fake" } })).entities[0].source).toEqual({ block: 1, pointer: "" });
  });
  it("bounds deep source pointers without dropping declarations or inventing shortened locations", () => {
    let value: unknown = org;
    for (let i = 0; i < 90; i++) value = { ...org, "@graph": [value] };
    const result = checkSchema(script(value));
    expect(result.entities).toHaveLength(91);
    expect(result.entities.every(e => e.source?.block === 1 && (e.source.pointer === undefined || e.source.pointer.length <= 512))).toBe(true);
    expect(result.entities.some(e => e.source?.pointer === undefined)).toBe(true);
    expect(result.entities.at(-1)?.source?.pointer).toBe("");
  });
  it("preserves derived locations through the real API response with mocked fetch and usage", async () => {
    const { fetchHtml } = await import("@/lib/scrape");
    vi.mocked(fetchHtml).mockResolvedValue(script(org) + script({ "@graph": [org] }));
    const { POST } = await import("@/app/api/tools/schema-checker/route");
    const response = await POST(new Request("https://example.invalid/api/tools/schema-checker", { method: "POST", body: JSON.stringify({ url: "https://example.invalid/page" }) }));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.entities.map((e: { source: unknown }) => e.source)).toEqual([{ block: 1, pointer: "" }, { block: 2, pointer: "/@graph/0" }]);
    const { commitUsage, releaseUsage } = await import("@/lib/usage-limits");
    expect(commitUsage).toHaveBeenCalledTimes(1);
    expect(releaseUsage).not.toHaveBeenCalled();
  });

});
