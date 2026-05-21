export type Competitor = {
  slug: string;
  name: string;
  tagline: string;
  url?: string;
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
  quickSummary?: string[];
  aeocheckBest?: string[];
  competitorBest?: string[];
  auditVsMonitoring?: string[];
  chooseAeocheckIf?: string[];
  chooseCompetitorIf?: string[];
  tableTakeaway?: string;
  ctaSupportLine?: string;
  faqs?: { q: string; a: string }[];
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
    metaDescription: "AEOCheck gives you a per-page AEO audit with schema analysis and PDF export from $14. Otterly monitors brand mentions. Different tools for different jobs.",
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
      "Manual paid access from $14 with no subscription required",
      "No signup required for a free preview scan",
      "Built for agencies, freelancers, and Webflow developers",
    ],
    features: [
      { label: "Free scan", aeocheck: true, competitor: false },
      { label: "No signup required", aeocheck: true, competitor: false },
      { label: "Per-page AEO audit", aeocheck: true, competitor: false },
      { label: "Schema detection", aeocheck: true, competitor: false },
      { label: "PDF export", aeocheck: true, competitor: false },
      { label: "Manual paid access", aeocheck: "$14 via contact", competitor: false },
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
    metaTitle: "AEOCheck vs Semrush AI: AEO Audits vs Enterprise SEO",
    metaDescription: "AEOCheck delivers focused AEO readiness audits from $14. Semrush AI is a $99/mo enterprise platform. For fast, affordable AI readiness, AEOCheck wins.",
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
      "Manual paid access from $14 vs $99/mo subscription",
      "Free scan with no account required",
      "Built specifically for answer engine optimization",
    ],
    features: [
      { label: "Free scan", aeocheck: true, competitor: false },
      { label: "No signup required", aeocheck: true, competitor: false },
      { label: "AEO-focused audit", aeocheck: true, competitor: "Partial" },
      { label: "Schema detection", aeocheck: true, competitor: "Partial" },
      { label: "PDF export", aeocheck: true, competitor: false },
      { label: "Manual paid access", aeocheck: "$14 via contact", competitor: false },
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
    metaDescription: "Compare AEOCheck and Peec AI for AEO audits, AI search visibility, ChatGPT visibility, schema checks, client-ready reports, and AI search analytics.",
    heroHeading: "AEOCheck vs Peec AI",
    heroSubheading: "Compare fast page-level AEO audits with ongoing AI search analytics, so you can choose the right workflow for your team.",
    verdict: "Peec AI tracks your visibility across AI platforms over time. AEOCheck tells you what's wrong with a specific page and how to fix it today. For freelancers and agencies delivering client work, AEOCheck is the faster, more affordable choice.",
    quickSummary: [
      "AEOCheck helps you audit a specific page and find technical, schema, metadata, and content gaps that affect AI search readiness.",
      "Peec AI helps teams monitor brand visibility across AI platforms over time, including competitor tracking and visibility analytics.",
      "They solve different jobs. Teams focused on execution often start with audits, then add monitoring once page foundations are stronger.",
    ],
    aeocheckBest: [
      "Free scan with no signup required",
      "Fast page-level AEO audit for a specific URL",
      "Schema and metadata checks with clear fixes",
      "AI readiness score and prioritized action plan",
      "Client-ready PDF report for handoff and reporting",
      "Useful for agencies, freelancers, Webflow developers, SEO freelancers, and founders",
    ],
    competitorBest: [
      "Ongoing AI visibility monitoring",
      "Brand mention tracking across AI platforms",
      "Competitor visibility tracking over time",
      "AI search analytics dashboards for trend analysis",
      "Useful for marketing teams and larger brands",
    ],
    auditVsMonitoring: [
      "A page-level AEO audit checks if a page gives AI systems enough structure and context to understand and cite it.",
      "AI visibility monitoring checks whether AI systems already mention, rank, or cite your brand over time.",
      "Many teams use both, but an audit is often the first step because it reveals immediate fixes.",
    ],
    chooseAeocheckIf: [
      "you want immediate fixes",
      "you need a client-ready report",
      "you are checking a specific URL",
      "you want to improve schema, metadata, content clarity, and AI readiness",
    ],
    chooseCompetitorIf: [
      "you need ongoing monitoring",
      "you care about share of voice across AI platforms",
      "you manage large brand or competitor tracking workflows",
    ],
    tableTakeaway:
      "The main difference is workflow. AEOCheck is built for quick page-level diagnosis and client-ready fixes. Peec AI is built for ongoing brand visibility tracking across AI search platforms.",
    ctaSupportLine:
      "Use AEOCheck first to fix page-level visibility blockers before investing in long-term monitoring.",
    faqs: [
      {
        q: "Is AEOCheck a Peec AI alternative?",
        a: "Yes. AEOCheck is a practical Peec AI alternative for teams that need fast page-level AEO audits, schema and metadata checks, and client-ready reports.",
      },
      {
        q: "What is the difference between AEOCheck and Peec AI?",
        a: "AEOCheck focuses on page-level AI search readiness audits and immediate fixes. Peec AI focuses on ongoing AI visibility monitoring and analytics over time.",
      },
      {
        q: "Which tool is better for agencies?",
        a: "Agencies that need fast URL audits and client deliverables usually benefit from AEOCheck first. Larger brand programs that need long-term tracking may add Peec AI style monitoring.",
      },
      {
        q: "Should I use an AEO scanner before AI visibility monitoring?",
        a: "In most cases, yes. AEO scanning identifies technical and semantic gaps first, which improves the quality of your later visibility monitoring signals.",
      },
      {
        q: "Does AEOCheck track brand mentions in AI answers?",
        a: "AEOCheck is primarily a page-level readiness scanner. It is built to diagnose and fix visibility blockers, rather than run large-scale ongoing brand mention tracking dashboards.",
      },
    ],
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
      "Manual paid access from $14 per report or $39/mo",
      "Free scan instantly, no account needed",
    ],
    features: [
      { label: "Free scan", aeocheck: true, competitor: false },
      { label: "No signup required", aeocheck: true, competitor: false },
      { label: "Per-page AEO audit", aeocheck: true, competitor: false },
      { label: "Schema detection", aeocheck: true, competitor: false },
      { label: "PDF export", aeocheck: true, competitor: false },
      { label: "Manual paid access", aeocheck: "$14 via contact", competitor: false },
      { label: "Monthly pricing", aeocheck: "$39/mo", competitor: "$95/mo+" },
      { label: "AI visibility tracking", aeocheck: false, competitor: true },
      { label: "Multi-domain analytics", aeocheck: false, competitor: true },
    ],
  },
  profound: {
    slug: "profound",
    name: "Profound",
    tagline: "Enterprise AI search visibility platform",
    price: "Custom pricing",
    priceNote: "Enterprise only, no self-serve",
    targetUser: "Large enterprise brands",
    metaTitle: "AEOCheck vs Profound: Self-Serve Audits vs Enterprise",
    metaDescription: "AEOCheck is self-serve AEO auditing from $14 with no sales call. Profound is enterprise with custom pricing. For agencies and freelancers, AEOCheck wins.",
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
      { label: "Manual paid access", aeocheck: "$14 via contact", competitor: false },
      { label: "Monthly pricing", aeocheck: "$39/mo", competitor: "Custom" },
      { label: "Enterprise contracts", aeocheck: false, competitor: true },
      { label: "Dedicated onboarding", aeocheck: false, competitor: true },
    ],
  },
};

export const COMPETITOR_SLUGS = Object.keys(COMPETITORS);
