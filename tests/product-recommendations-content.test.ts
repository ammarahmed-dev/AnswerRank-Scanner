import { beforeAll, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { load, type CheerioAPI } from "cheerio";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { getBlogPost } from "@/lib/blog";
import { checkSchema } from "@/lib/schema-check";
import sitemap from "@/app/sitemap";
vi.mock("@/app/components/SiteHeader", () => ({ default: () => null }));
vi.mock("@/app/components/SiteFooter", () => ({ default: () => null }));
vi.mock("@/app/components/ServiceCta", () => ({ default: () => null }));
import { generateMetadata } from "@/app/blog/[slug]/page";

const slug = "chatgpt-product-recommendations";
const post = getBlogPost(slug)!;
let $: CheerioAPI;
beforeAll(async () => {
  const { content } = await compileMDX({ source: post.content, options: { mdxOptions: { remarkPlugins: [remarkGfm] } } });
  $ = load(renderToStaticMarkup(content));
});
describe("published product recommendation guide", () => {
  it("renders an inert, parseable original example whose product and seller agree with the visible scenario", () => {
    expect($("script")).toHaveLength(0);
    const code = $("pre code").text();
    const result = checkSchema(code);
    expect(result.blocks).toMatchObject([{ valid: true }]);
    expect(result.entities).toMatchObject([
      { type: "Organization", source: { block: 1, pointer: "/@graph/0" }, missingRequired: [] },
      { type: "Product", source: { block: 1, pointer: "/@graph/1" }, missingRequired: [] },
    ]);
    const graph = JSON.parse(load(code)("script").text())["@graph"];
    const [seller, product] = graph;
    expect(product.offers.seller["@id"]).toBe(seller["@id"]);
    expect(product.offers.url).toBe(product.url);
    const visible = $("p").map((_, el) => $(el).text()).get().join(" ");
    for (const fact of [seller.name, product.sku, product.offers.price, product.offers.priceCurrency]) expect(visible).toContain(fact);
    expect(product.name).toContain("800 lm");
    expect(visible).toContain("in stock");
    expect(product).not.toHaveProperty("aggregateRating");
    expect(product).not.toHaveProperty("review");
    expect(visible).toContain("fictional example");
  });
  it("keeps visible FAQ answers aligned with structured-data inputs and preserves repair/measurement destinations", () => {
    for (const faq of post.faqs!) {
      const question = $("strong").filter((_, el) => $(el).text() === faq.question);
      expect(question).toHaveLength(1);
      expect(question.parent().next("p").text()).toBe(faq.answer);
    }
    for (const href of ["/tools/schema-checker", "/tools/ai-crawler-checker", "/#scanner", "/sample-report", "/pricing", "/blog/how-to-get-cited-by-chatgpt", "/blog/how-to-check-if-website-appears-in-chatgpt-recommendations", "https://help.openai.com/en/articles/11128490-shopping-with-chatgpt-search", "https://schema.org/Product", "https://developers.openai.com/api/docs/bots"]) expect($(`a[href="${href}"]`).length).toBeGreaterThan(0);
    expect($("body").text()).toContain("do not measure live ChatGPT inclusion");
    expect($("body").text()).toContain("no schema type guarantees a ChatGPT recommendation");
  });
  it("retains the original publication, title and canonical while recording the substantive update", async () => {
    expect(post.date.slice(0, 10)).toBe("2026-06-05");
    expect(post.updated?.slice(0, 10)).toBe("2026-11-26");
    expect(post.title).toBe("How to Get Your Website into ChatGPT Product Recommendations");
    expect(post.description.length).toBeLessThanOrEqual(155);
    const metadata = await generateMetadata({ params: Promise.resolve({ slug }) });
    expect(metadata.alternates?.canonical).toBe(`https://www.aeocheck.co/blog/${slug}`);
    const entry = (await sitemap()).find(entry => entry.url.endsWith(`/blog/${slug}`));
    expect(new Date(entry!.lastModified!).toISOString().slice(0, 10)).toBe("2026-11-26");
  });
});
