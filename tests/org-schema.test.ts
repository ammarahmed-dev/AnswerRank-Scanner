import { describe, expect, it } from "vitest";
import { buildOrgSchema, isHttpUrl, orgSchemaProblems, orgSchemaScriptTag } from "@/lib/org-schema";
import { checkSchema } from "@/lib/schema-check";

const valid = { name: "Acme Inc", url: "https://acme.com/about", logo: "https://acme.com/logo.png", description: "We make anvils.", sameAs: ["https://www.linkedin.com/company/acme", " "], email: "hi@acme.com", foundingDate: "2019" };

describe("organization schema", () => {
  it("builds Organization + WebSite with linked ids", () => {
    const schema = buildOrgSchema(valid);
    const [org, site] = schema["@graph"] as Record<string, unknown>[];
    expect(org["@id"]).toBe("https://acme.com/#organization");
    expect(org.logo).toEqual({ "@type": "ImageObject", url: "https://acme.com/logo.png" });
    expect(org.sameAs).toEqual(["https://www.linkedin.com/company/acme"]);
    expect(site["@type"]).toBe("WebSite");
    expect(site.publisher).toEqual({ "@id": "https://acme.com/#organization" });
  });

  it("can skip the WebSite node and omits empty optional fields", () => {
    const schema = buildOrgSchema({ name: "A", url: "https://a.test", includeWebSite: false });
    const graph = schema["@graph"] as Record<string, unknown>[];
    expect(graph).toHaveLength(1);
    expect(Object.keys(graph[0]).sort()).toEqual(["@id", "@type", "name", "url"]);
  });

  it("validates input", () => {
    expect(orgSchemaProblems(valid)).toEqual([]);
    expect(orgSchemaProblems({ name: "", url: "" })).toHaveLength(2);
    expect(orgSchemaProblems({ name: "A", url: "acme.com" })[0]).toContain("full URL");
    expect(orgSchemaProblems({ ...valid, logo: "logo.png" }).join(" ")).toContain("logo");
    expect(orgSchemaProblems({ ...valid, sameAs: ["linkedin.com/acme"] }).join(" ")).toContain("profile links");
    expect(orgSchemaProblems({ ...valid, email: "nope" }).join(" ")).toContain("email");
    expect(orgSchemaProblems({ ...valid, foundingDate: "last year" }).join(" ")).toContain("Founding date");
    expect(isHttpUrl("ftp://x.test")).toBe(false);
  });

  it("generated markup passes the schema checker with no missing properties", () => {
    const tag = orgSchemaScriptTag(valid);
    const result = checkSchema(`<html><head>${tag}</head></html>`);
    expect(result.types).toEqual(["Organization", "WebSite"]);
    for (const e of result.entities) expect(e.missingRequired, e.type).toEqual([]);
    expect(result.entities.find((e) => e.type === "Organization")?.missingRecommended).toEqual([]);
  });

  it("escapes < in text so the script tag cannot be closed early", () => {
    const tag = orgSchemaScriptTag({ ...valid, description: "x</script><b>" });
    expect(tag.slice(0, -9)).not.toContain("</script>");
  });
});
