import { describe, expect, it } from "vitest";
import { buildLlmsTxt, cleanTitle, guessSiteName, sectionFor } from "@/lib/llms-txt";

describe("llms.txt builder", () => {
  it("follows the llmstxt.org structure", () => {
    const out = buildLlmsTxt({
      siteName: "Acme",
      summary: "Acme is payroll software for small businesses.",
      pages: [
        { url: "https://acme.com/", title: "Acme | Payroll for small business", description: "Run payroll in minutes." },
        { url: "https://acme.com/pricing", title: "Pricing | Acme", description: "Plans from $9." },
        { url: "https://acme.com/blog/payroll-tips", title: "Payroll tips - Acme", description: "" },
        { url: "https://acme.com/privacy", title: "Privacy Policy", description: "How we handle data." },
      ],
    });
    expect(out.startsWith("# Acme\n\n> Acme is payroll software for small businesses.\n")).toBe(true);
    expect(out).toContain("## Pages\n\n- [Payroll for small business](https://acme.com/): Run payroll in minutes.");
    expect(out).toContain("## Product\n\n- [Pricing](https://acme.com/pricing): Plans from $9.");
    expect(out).toContain("## Blog\n\n- [Payroll tips](https://acme.com/blog/payroll-tips)\n");
    expect(out.indexOf("## Optional")).toBeGreaterThan(out.indexOf("## Blog"));
    expect(out.endsWith("\n")).toBe(true);
  });

  it("dedupes trailing-slash variants and strips brackets that would break links", () => {
    const out = buildLlmsTxt({ siteName: "X", summary: "", pages: [
      { url: "https://x.com/a/", title: "A [beta]", description: "" },
      { url: "https://x.com/a", title: "A", description: "" },
    ] });
    expect(out.match(/- \[/g)).toHaveLength(1);
    expect(out).toContain("- [A beta]");
  });

  it("classifies sections", () => {
    expect(sectionFor("https://x.com/docs/start")).toBe("Docs");
    expect(sectionFor("https://x.com/about")).toBe("Company");
    expect(sectionFor("https://x.com/terms-of-service")).toBe("Optional");
    expect(sectionFor("https://x.com/case-studies")).toBe("Pages");
  });

  it("cleans titles and guesses site names", () => {
    expect(cleanTitle("Pricing | Acme", "Acme")).toBe("Pricing");
    expect(guessSiteName({ ogSiteName: "Acme Inc", title: "x", url: "https://acme.com" })).toBe("Acme Inc");
    expect(guessSiteName({ title: "Acme | Payroll software for small businesses", url: "https://acme.com" })).toBe("Acme");
    expect(guessSiteName({ title: "", url: "https://www.stripe.com" })).toBe("Stripe");
  });
});

describe("rankPages", () => {
  it("prefers key sections and shallow pages, capping deep folders", async () => {
    const { rankPages } = await import("@/lib/llms-txt");
    const o = "https://stripe.com";
    const urls = [
      ...Array.from({ length: 20 }, (_, i) => `${o}/customers/case-${i}`),
      `${o}/pricing`, `${o}/docs`, `${o}/about`, `${o}/privacy`, `${o}/`, "https://other.com/pricing",
    ];
    const picked = rankPages(urls, o, 8);
    expect(picked.slice(0, 3).sort()).toEqual([`${o}/about`, `${o}/docs`, `${o}/pricing`]);
    expect(picked.filter((u) => u.includes("/customers/")).length).toBeLessThanOrEqual(3);
    expect(picked).not.toContain("https://other.com/pricing");
    expect(picked).not.toContain(`${o}/`);
    expect(picked.indexOf(`${o}/privacy`)).toBe(picked.length - 1);
  });
});

describe("optional pages", () => {
  it("treats legal agreements as optional", async () => {
    const { sectionFor } = await import("@/lib/llms-txt");
    expect(sectionFor("https://linear.app/dpa")).toBe("Optional");
  });
});
