import { describe, expect, it } from "vitest";
import { articleSchemaProblems, articleSchemaScriptTag, buildArticleSchema, isIsoDate, type ArticleInput } from "@/lib/article-schema";
import { checkSchema } from "@/lib/schema-check";

const valid: ArticleInput = {
  type: "BlogPosting",
  headline: "How to get cited by AI search",
  url: "https://acme.com/blog/cited",
  description: "A practical guide.",
  image: "https://acme.com/cover.png",
  datePublished: "2026-10-01",
  dateModified: "2026-10-04",
  authorName: "Ammar Ahmed",
  authorUrl: "https://acme.com/about",
  publisherName: "Acme",
  publisherLogo: "https://acme.com/logo.png",
};

describe("article schema", () => {
  it("builds the markup with author, publisher and page id", () => {
    const s = buildArticleSchema(valid);
    expect(s["@type"]).toBe("BlogPosting");
    expect(s.mainEntityOfPage).toEqual({ "@type": "WebPage", "@id": "https://acme.com/blog/cited" });
    expect(s.author).toEqual({ "@type": "Person", name: "Ammar Ahmed", url: "https://acme.com/about" });
    expect(s.publisher).toEqual({ "@type": "Organization", name: "Acme", logo: { "@type": "ImageObject", url: "https://acme.com/logo.png" } });
    expect(s.image).toEqual(["https://acme.com/cover.png"]);
  });

  it("falls back to the publish date for dateModified and omits optional blocks", () => {
    const s = buildArticleSchema({ type: "Article", headline: "H", url: "https://a.test/p", datePublished: "2026-01-02", authorName: "A" });
    expect(s.dateModified).toBe("2026-01-02");
    expect("publisher" in s).toBe(false);
    expect("image" in s).toBe(false);
  });

  it("validates dates, URLs and required fields", () => {
    expect(articleSchemaProblems(valid)).toEqual([]);
    expect(articleSchemaProblems({ ...valid, headline: "", authorName: "", datePublished: "" })).toHaveLength(3);
    expect(articleSchemaProblems({ ...valid, headline: "x".repeat(111) }).join(" ")).toContain("110");
    expect(articleSchemaProblems({ ...valid, url: "acme.com/x" }).join(" ")).toContain("full URL");
    expect(articleSchemaProblems({ ...valid, datePublished: "10/01/2026" }).join(" ")).toContain("publish date");
    expect(articleSchemaProblems({ ...valid, dateModified: "2026-09-01" }).join(" ")).toContain("earlier");
    expect(articleSchemaProblems({ ...valid, image: "cover.png" }).join(" ")).toContain("image");
    expect(isIsoDate("2026-10-04T09:00:00Z")).toBe(true);
    expect(isIsoDate("2026-13-01")).toBe(false);
  });

  it("passes the schema checker with nothing missing", () => {
    const r = checkSchema(`<html><head>${articleSchemaScriptTag(valid)}</head></html>`);
    expect(r.types).toEqual(["BlogPosting"]);
    expect(r.entities[0].missingRequired).toEqual([]);
    expect(r.entities[0].missingRecommended).toEqual([]);
  });

  it("escapes < in text", () => {
    expect(articleSchemaScriptTag({ ...valid, headline: "a</script>b" }).slice(0, -9)).not.toContain("</script>");
  });
});
