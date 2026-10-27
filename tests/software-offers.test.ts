import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { load } from "cheerio";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/app/context/AuthContext", () => ({ useAuth: () => ({ plan: "guest", loading: false }) }));
vi.mock("@/app/components/SiteHeader", () => ({ default: () => null }));
vi.mock("@/app/components/SiteFooter", () => ({ default: () => null }));
import PricingPage from "@/app/pricing/page";
import { PLAN_LIMITS } from "@/lib/access";
import { buildSoftwareApplicationSchema, PAID_SOFTWARE_PLANS, SOFTWARE_PLANS } from "@/lib/software-offers";

const site = "https://www.aeocheck.co";
describe("published software offer consistency", () => {
  it("preserves published prices, names, billing periods and checkout plan identifiers", () => {
    expect(SOFTWARE_PLANS.map(p => [p.key, p.name, p.priceUsd, p.price, p.billing, p.period])).toEqual([
      ["free", "Free", 0, "$0", "free", "forever"],
      ["onetime", "Starter", 9, "$9", "one_time", "one-time"],
      ["pro", "Pro", 19, "$19", "monthly", "/ month"],
      ["agency", "Agency", 49, "$49", "monthly", "/ month"],
    ]);
    expect(PAID_SOFTWARE_PLANS).toEqual(["onetime", "pro", "agency"]);
    expect(PLAN_LIMITS).toEqual({
      free: { auditPages: 5, auditPerDay: 1, monitorUrls: 1, scanPerMonth: 3 },
      onetime: { auditPages: 50, auditRescans: 3, monitorUrls: 1, fullReport: true },
      pro: { auditPages: 100, auditRescans: 10, monitorUrls: 10, scanUnlimited: true },
      agency: { auditPages: 500, auditRescans: 20, monitorUrls: -1, scanUnlimited: true },
    });
  });
  it("attaches offers directly to the software entity with accurate unlimited and report-scope descriptions", () => {
    const schema = buildSoftwareApplicationSchema(site);
    expect(schema).toMatchObject({ "@type": "SoftwareApplication", applicationCategory: "BusinessApplication" });
    expect(schema).not.toHaveProperty("hasOfferCatalog");
    expect(schema.offers).toHaveLength(4);
    expect(schema.offers[3].description).toContain("Unlimited monitored URLs");
    expect(schema.offers[1].description).toContain("1 full report URL · preview on all others");
    expect(JSON.stringify(schema)).not.toMatch(/-1|aggregateRating|ratingCount|reviewCount/);
    expect(schema).not.toHaveProperty("review");
  });
  it("publishes monthly unit prices only for subscriptions and retains all canonical offer URLs", () => {
    const offers = buildSoftwareApplicationSchema(site).offers;
    for (const [i, offer] of offers.entries()) {
      expect(offer).toMatchObject({ "@type": "Offer", name: SOFTWARE_PLANS[i].name, price: String(SOFTWARE_PLANS[i].priceUsd), priceCurrency: "USD", url: site + "/pricing" });
      if (i < 2) expect(offer).not.toHaveProperty("priceSpecification");
      else expect(offer.priceSpecification).toEqual({ "@type": "UnitPriceSpecification", price: offer.price, priceCurrency: "USD", unitCode: "MON" });
    }
  });
  it("renders the same facts in actual pricing cards, FAQ and server JSON-LD", () => {
    const $ = load(renderToStaticMarkup(createElement(PricingPage)));
    const scripts = $('script[type="application/ld+json"]').map((_, el) => JSON.parse($(el).text())).get();
    const schema = scripts.find(s => s['@type'] === 'SoftwareApplication');
    expect(schema).toEqual(buildSoftwareApplicationSchema(site));
    const visible = $('main').text();
    for (const p of SOFTWARE_PLANS) {
      expect(visible).toContain(p.name);
      expect(visible).toContain(p.price);
      expect(visible).toContain(p.period);
      for (const highlight of p.highlights) expect(visible).toContain(highlight);
    }
    expect(visible).toContain("Buy once - $9");
    expect(visible).toContain("A single payment of $9");
    expect(scripts.find(s => s['@type'] === 'FAQPage').mainEntity.find((q: { name: string }) => q.name === 'What is the Starter one-time plan?').acceptedAnswer.text).toContain("one-time payment of $9");
    expect(visible).not.toContain("-1 monitored");
  });
});
