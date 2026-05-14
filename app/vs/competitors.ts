export type Competitor = {
  slug: string;
  name: string;
  tagline: string;
  url: string;
  price: string;
  priceNote: string;
  targetUser: string;
  metaTitle: string;
  metaDescription: string;
  heroHeading: string;
  heroSubheading: string;
  verdict: string;
  theyWinAt: string[];
  weWinAt: string[];
  features: {
    label: string;
    aeocheck: boolean | string;
    competitor: boolean | string;
  }[];
};

export const COMPETITORS: Record<string, Competitor> = {
  otterly: {
    slug: "otterly",
    name: "Otterly",
    tagline: "Brand monitoring across AI platforms",
    url: "https://otterly.ai",
    price: "$29/mo+",
    priceNote: "Subscription only",
    targetUser: "Enterprise brand teams",
    metaTitle: "AEOCheck vs Otterly: Page Audit vs Brand Monitoring",
    metaDescription: "AEOCheck gives you a deep per-page AEO audit with schema analysis and PDF export from $14. Otterly monitors brand mentions across AI platforms. Different tools for different jobs.",
    heroHeading: "AEOCheck vs Otterly",
    heroSubheading: "Per-page AEO audits vs AI brand monitoring. Here's which tool you actually need.",
    verdict: "Otterly tracks whether your brand appears in AI answers. AEOCheck tells you why it doesn't, and exactly how to fix it. If you need actionable page-level fixes with a client-ready PDF, AEOCheck is the right tool.",
    theyWinAt: [
      "Monitoring brand mentions across multiple AI platforms",
      "Tracking competitor brand visibility over time",
      "Enterprise-scale brand analytics dashboards",
      "Long-term AI visibility trend reporting",
      "Multi-domain brand coverage in one dashboard",
    ],
    weWinAt: [
      "Deep per-page AEO audit with 20+ checks",
      "Schema detection and implementation guidance",
      "Client-ready PDF reports you can hand off immediately",
      "One-time $14 payment, no subscription needed",
      "No signup required for a free preview scan",
      "Built for agencies, freelancers, and Webflow developers",
    ],
    features: [
      { label: "Free scan", aeocheck: true, competitor: false },
      { label: "No signup required", aeocheck: true, competitor: false },
      { label: "Per-page AEO audit", aeocheck: true, competitor: false },
      { label: "Schema detection", aeocheck: true, competitor: false },
      { label: "PDF export", aeocheck: true, competitor: false },
      { label: "One-time payment option", aeocheck: "$14", competitor: false },
      { label: "Monthly pricing", aeocheck: "$39/mo", competitor: "$29/mo+" },
      { label: "AI brand monitoring", aeocheck: false, competitor: true },
      { label: "Multi-platform tracking", aeocheck: false, competitor: true },
    ],
  },
  "semrush-ai": {
    slug: "semrush-ai",
    name: "Semrush AI",
    tagline: "Enterprise SEO platform with AI features",
    url: "https://semrush.com",
    price: "$99/mo+",
    priceNote: "Subscription only, enterprise pricing",
    targetUser: "Enterprise SEO teams",
    metaTitle: "AEOCheck vs Semrush AI: Affordable AEO Audits vs Enterprise SEO",
    metaDescription: "AEOCheck delivers focused AEO readiness audits from $14. Semrush AI is a $99/mo enterprise platform. If you need fast, affordable AI search readiness, AEOCheck wins.",
    heroHeading: "AEOCheck vs Semrush AI",
    heroSubheading: "A focused AEO audit tool vs a full enterprise SEO platform. Here's the honest comparison.",
    verdict: "Semrush is a powerful enterprise platform but overkill for AEO audits. AEOCheck focuses entirely on AI search readiness, giving you faster, more actionable results at a fraction of the cost.",
    theyWinAt: [
      "Full-suite SEO platform with backlink analysis",
      "Keyword research and rank tracking",
      "Large enterprise teams managing hundreds of domains",
      "Comprehensive backlink and domain analysis",
      "Long-term keyword rank tracking over time",
    ],
    weWinAt: [
      "Focused AEO and AI search readiness auditing",
      "Instant results with no setup or onboarding",
      "Client-ready PDF in one click",
      "One-time $14 payment vs $99/mo subscription",
      "Free scan with no account required",
      "Built specifically for answer engine optimization",
    ],
    features: [
      { label: "Free scan", aeocheck: true, competitor: false },
      { label: "No signup required", aeocheck: true, competitor: false },
      { label: "AEO-focused audit", aeocheck: true, competitor: "Partial" },
      { label: "Schema detection", aeocheck: true, competitor: "Partial" },
      { label: "PDF export", aeocheck: true, competitor: false },
      { label: "One-time payment", aeocheck: "$14", competitor: false },
      { label: "Monthly pricing", aeocheck: "$39/mo", competitor: "$99/mo+" },
      { label: "Keyword research", aeocheck: false, competitor: true },
      { label: "Backlink analysis", aeocheck: false, competitor: true },
      { label: "Rank tracking", aeocheck: false, competitor: true },
    ],
  },
  "peec-ai": {
    slug: "peec-ai",
    name: "Peec AI",
    tagline: "AI search analytics and visibility tracking",
    url: "https://peec.ai",
    price: "$95/mo+",
    priceNote: "Subscription only",
    targetUser: "Marketing teams tracking AI visibility",
    metaTitle: "AEOCheck vs Peec AI: Page Audits vs AI Search Analytics",
    metaDescription: "AEOCheck audits individual pages for AEO readiness from $14. Peec AI tracks AI search visibility at scale. Different tools for different budgets and goals.",
    heroHeading: "AEOCheck vs Peec AI",
    heroSubheading: "Actionable per-page AEO audits vs AI search analytics dashboards.",
    verdict: "Peec AI tracks your visibility across AI platforms over time. AEOCheck tells you what's wrong with a specific page and how to fix it today. For freelancers and agencies delivering client work, AEOCheck is the faster, more affordable choice.",
    theyWinAt: [
      "Tracking AI search visibility trends over time",
      "Multi-domain analytics dashboards",
      "Enterprise reporting for large marketing teams",
      "Long-term AI search visibility trend data",
      "Cross-domain analytics for large brand portfolios",
    ],
    weWinAt: [
      "Immediate actionable fixes for individual pages",
      "Deep schema and metadata analysis",
      "Client-ready PDF reports",
      "No subscription required. Pay $14 per report or $39/mo",
      "Free scan instantly, no account needed",
    ],
    features: [
      { label: "Free scan", aeocheck: true, competitor: false },
      { label: "No signup required", aeocheck: true, competitor: false },
      { label: "Per-page AEO audit", aeocheck: true, competitor: false },
      { label: "Schema detection", aeocheck: true, competitor: false },
      { label: "PDF export", aeocheck: true, competitor: false },
      { label: "One-time payment", aeocheck: "$14", competitor: false },
      { label: "Monthly pricing", aeocheck: "$39/mo", competitor: "$95/mo+" },
      { label: "AI visibility tracking", aeocheck: false, competitor: true },
      { label: "Multi-domain analytics", aeocheck: false, competitor: true },
    ],
  },
  profound: {
    slug: "profound",
    name: "Profound",
    tagline: "Enterprise AI search visibility platform",
    url: "https://profound.co",
    price: "Custom pricing",
    priceNote: "Enterprise only, no self-serve",
    targetUser: "Large enterprise brands",
    metaTitle: "AEOCheck vs Profound: Self-Serve AEO Audits vs Enterprise Platform",
    metaDescription: "AEOCheck is self-serve AEO auditing from $14 with no sales call needed. Profound is an enterprise platform with custom pricing. For agencies and freelancers, AEOCheck is the clear choice.",
    heroHeading: "AEOCheck vs Profound",
    heroSubheading: "Instant self-serve AEO audits vs enterprise AI visibility platform.",
    verdict: "Profound is built for large enterprises with custom contracts and dedicated onboarding. AEOCheck is built for agencies, freelancers, and developers who need fast, affordable AEO audits without a sales call.",
    theyWinAt: [
      "Enterprise-scale AI visibility programs",
      "Dedicated customer success and onboarding",
      "Custom integrations for large organizations",
      "White-glove onboarding and dedicated support",
      "Custom AI visibility programs for large brands",
    ],
    weWinAt: [
      "Instant access with no sales call or demo required",
      "Affordable pricing starting at $0",
      "Per-page audit with actionable fixes",
      "Client-ready PDF in one click",
      "Perfect for agencies and freelancers",
      "Schema analysis and implementation guidance",
    ],
    features: [
      { label: "Free scan", aeocheck: true, competitor: false },
      { label: "No signup required", aeocheck: true, competitor: false },
      { label: "Self-serve access", aeocheck: true, competitor: false },
      { label: "Per-page AEO audit", aeocheck: true, competitor: "Partial" },
      { label: "Schema detection", aeocheck: true, competitor: false },
      { label: "PDF export", aeocheck: true, competitor: false },
      { label: "One-time payment", aeocheck: "$14", competitor: false },
      { label: "Monthly pricing", aeocheck: "$39/mo", competitor: "Custom" },
      { label: "Enterprise contracts", aeocheck: false, competitor: true },
      { label: "Dedicated onboarding", aeocheck: false, competitor: true },
    ],
  },
};

export const COMPETITOR_SLUGS = Object.keys(COMPETITORS);
