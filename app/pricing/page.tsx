import type { Metadata } from "next";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";
import { PLAN_LIMITS } from "@/lib/access";
import SiteHeader from "@/app/components/SiteHeader";
import SiteFooter from "@/app/components/SiteFooter";
import PricingClient from "./PricingClient";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing - AEOCheck | Free AEO Scanner Plans",
  description:
    "Start scanning your website's AI visibility for free. Upgrade for multi-page audits, monitoring, and PDF reports. Plans from $9.",
  path: "/pricing",
});

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is there a free plan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Yes - no credit card required. The Free plan lets you run ${PLAN_LIMITS.free.scanPerMonth} scans per month and audit up to ${PLAN_LIMITS.free.auditPages} pages per run. Limits reset at the start of each calendar month.`,
      },
    },
    {
      "@type": "Question",
      name: "What is the Starter one-time plan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `The Starter plan is a one-time payment of $9. You get ${PLAN_LIMITS.onetime.auditPages}-page audit runs, ${PLAN_LIMITS.onetime.monitorUrls} monitored URLs, and ${PLAN_LIMITS.onetime.auditRescans} re-scan snapshots - no recurring charges.`,
      },
    },
    {
      "@type": "Question",
      name: "Can I cancel my subscription at any time?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Pro and Agency plans are billed monthly and can be cancelled at any time from your account settings. You keep full access until the end of your billing period.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between a scan and an audit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A scan checks a single URL for AI search visibility signals. An audit is a deeper crawl that checks multiple pages of a site in one run and produces a full-site score with recommendations.",
      },
    },
    {
      "@type": "Question",
      name: "Do you offer refunds?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes - contact us within 14 days of purchase and we will issue a full refund, no questions asked.",
      },
    },
    {
      "@type": "Question",
      name: "What happens when I reach my free scan limit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: `Free accounts get ${PLAN_LIMITS.free.scanPerMonth} scans per month. When you hit the limit you will be prompted to upgrade. Your count resets at the start of each calendar month.`,
      },
    },
  ],
};

const softwareAppSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AEOCheck",
  applicationCategory: "SEOApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description:
    "AI search readiness and AEO scanner for website visibility in ChatGPT, Perplexity, and Google AI results.",
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "AEOCheck Plans",
    itemListElement: [
      {
        "@type": "Offer",
        name: "Free",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/pricing`,
        description: `${PLAN_LIMITS.free.scanPerMonth} scans/month, ${PLAN_LIMITS.free.auditPages}-page audit runs.`,
      },
      {
        "@type": "Offer",
        name: "Starter",
        price: "9",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/pricing`,
        description: `One-time purchase. ${PLAN_LIMITS.onetime.auditPages}-page audit runs, PDF export, ${PLAN_LIMITS.onetime.monitorUrls} monitored URLs.`,
      },
      {
        "@type": "Offer",
        name: "Pro",
        price: "19",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/pricing`,
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "19",
          priceCurrency: "USD",
          unitCode: "MON",
        },
        description: `$19/month. Unlimited scans, ${PLAN_LIMITS.pro.auditPages}-page audit runs, ${PLAN_LIMITS.pro.monitorUrls} monitored URLs, PDF export, priority support.`,
      },
      {
        "@type": "Offer",
        name: "Agency",
        price: "49",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/pricing`,
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "49",
          priceCurrency: "USD",
          unitCode: "MON",
        },
        description: `$49/month. Unlimited scans, ${PLAN_LIMITS.agency.auditPages}-page audit runs, ${PLAN_LIMITS.agency.monitorUrls} monitored URLs, for agencies managing multiple clients.`,
      },
    ],
  },
};

export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <SiteHeader />
      <main>
        <PricingClient />
      </main>
      <SiteFooter />
    </>
  );
}
