import { PLAN_LIMITS } from "@/lib/access";

// Published software offers only. These do not grant rights or set provider variant prices.
export const PAID_SOFTWARE_PLANS = ["onetime", "pro", "agency"] as const;
export type PaidSoftwarePlan = (typeof PAID_SOFTWARE_PLANS)[number];
export type SoftwarePlanKey = "free" | PaidSoftwarePlan;

type SoftwarePlanDefinition = {
  key: SoftwarePlanKey;
  name: string;
  priceUsd: number;
  billing: "free" | "one_time" | "monthly";
  period: string;
  description: string;
  highlights: string[];
  popular?: true;
};

const DEFINITIONS: readonly SoftwarePlanDefinition[] = [
  {
    key: "free",
    name: "Free",
    billing: "free",
    priceUsd: 0,
    period: "forever",
    description: "Try AEO scanning on your most important pages - no commitment.",
    highlights: [
      `${PLAN_LIMITS.free.scanPerMonth} scans per month`,
      `${PLAN_LIMITS.free.auditPages}-page audit runs`,
      `${PLAN_LIMITS.free.monitorUrls} monitored URL`,
    ],
  },
  {
    key: "onetime",
    name: "Starter",
    billing: "one_time",
    priceUsd: 9,
    period: "one-time",
    description: "A single deep-dive audit - great for one-off projects or clients.",
    highlights: [
      "1 full report URL · preview on all others",
      `${PLAN_LIMITS.onetime.auditPages}-page audit runs`,
      `${PLAN_LIMITS.onetime.monitorUrls} monitored URLs`,
      `${PLAN_LIMITS.onetime.auditRescans} re-scan snapshots`,
      "PDF export included",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    billing: "monthly",
    priceUsd: 19,
    period: "/ month",
    description: "Ongoing monitoring and reports for growing businesses.",
    popular: true,
    highlights: [
      "Unlimited scans",
      `${PLAN_LIMITS.pro.auditPages}-page audit runs`,
      `${PLAN_LIMITS.pro.monitorUrls} monitored URLs`,
      `${PLAN_LIMITS.pro.auditRescans} re-scan snapshots`,
      "PDF export + priority support",
    ],
  },
  {
    key: "agency",
    name: "Agency",
    billing: "monthly",
    priceUsd: 49,
    period: "/ month",
    description: "Unlimited scale for agencies managing multiple clients.",
    highlights: [
      "Unlimited scans",
      `${PLAN_LIMITS.agency.auditPages}-page audit runs`,
      "Unlimited monitored URLs",
      `${PLAN_LIMITS.agency.auditRescans} re-scan snapshots`,
      "PDF export + priority support",
    ],
  },
];


export const SOFTWARE_PLANS = DEFINITIONS.map(plan => ({ ...plan, price: `$${plan.priceUsd}` }));

export function softwarePriceLabel(key: SoftwarePlanKey) {
  return SOFTWARE_PLANS.find(plan => plan.key === key)!.price;
}

/** Describe the same published offer facts as the visible pricing cards. */
export function buildSoftwareApplicationSchema(siteUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "AEOCheck",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "AEO and SEO analysis",
    operatingSystem: "Web",
    url: siteUrl,
    description: "AI search readiness and AEO scanner for website visibility in ChatGPT, Perplexity, and Google AI results.",
    offers: SOFTWARE_PLANS.map(plan => ({
      "@type": "Offer",
      name: plan.name,
      price: String(plan.priceUsd),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${siteUrl}/pricing`,
      ...(plan.billing === "monthly" ? { priceSpecification: {
        "@type": "UnitPriceSpecification", price: String(plan.priceUsd), priceCurrency: "USD", unitCode: "MON",
      } } : {}),
      description: `${plan.billing === "monthly" ? `${plan.price}/month. ` : plan.billing === "one_time" ? "One-time purchase. " : ""}${plan.highlights.join(", ")}.`,
    })),
  };
}
