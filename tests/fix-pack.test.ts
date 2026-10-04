import { describe, expect, it } from "vitest";
import { buildFixPack } from "@/lib/fix-pack";
import { analyzeAiCrawlerAccess } from "@/lib/robots";
import type { CheckResult } from "@/types/index";

const check = (id: string, status: CheckResult["status"]): CheckResult => ({ id, label: id, status, detail: "", weight: 1 });
const base = {
  url: "https://shop.example.com/",
  metadata: { title: "Acme | Garden tools", metaDescription: "Tools for \"every\" garden.", ogTitle: "", ogDescription: "", ogImage: "", canonical: "", h1: "Acme" },
  schemaTypes: [] as string[],
};

describe("buildFixPack", () => {
  it("returns nothing when every relevant check passes", () => {
    const checks = ["ai_bot_access", "robots", "schema_present", "llms_txt", "canonical", "og_tags"].map((id) => check(id, "pass"));
    expect(buildFixPack({ ...base, checks })).toEqual([]);
  });

  it("does not offer a robots.txt when AI access is only unverified", () => {
    const items = buildFixPack({ ...base, checks: [check("ai_bot_access", "warn"), check("robots", "pass")] });
    expect(items.find((i) => i.id === "robots")).toBeUndefined();
  });

  it("generates a robots.txt that the scanner's own parser reads as open", () => {
    const items = buildFixPack({ ...base, checks: [check("ai_bot_access", "fail"), check("robots", "pass"), check("sitemap", "fail")] });
    const robots = items.find((i) => i.id === "robots");
    expect(robots?.content).toContain("Sitemap: https://shop.example.com/sitemap.xml");
    expect(robots?.checkIds).toEqual(["ai_bot_access"]);
    expect(analyzeAiCrawlerAccess(robots!.content).status).toBe("pass");
  });

  it("builds org schema, llms.txt and head tags with escaped values", () => {
    const items = buildFixPack({
      ...base,
      checks: [check("schema_present", "fail"), check("llms_txt", "fail"), check("canonical", "warn"), check("og_tags", "fail")],
    });
    expect(items.map((i) => i.id)).toEqual(["org-schema", "llms-txt", "head-tags"]);
    const org = items[0].content;
    expect(org).toContain('"@type": "Organization"');
    expect(org).toContain('"name": "Acme"');
    expect(items[1].content.startsWith("# Acme\n")).toBe(true);
    const head = items[2].content;
    expect(head).toContain('<link rel="canonical" href="https://shop.example.com/">');
    expect(head).toContain('content="Tools for &quot;every&quot; garden."');
  });

  it("skips org schema when an Organization already exists", () => {
    const items = buildFixPack({ ...base, schemaTypes: ["Organization"], checks: [check("schema_present", "warn")] });
    expect(items).toEqual([]);
  });

  it("returns nothing for an unparseable URL", () => {
    expect(buildFixPack({ ...base, url: "not a url", checks: [check("llms_txt", "fail")] })).toEqual([]);
  });
});
