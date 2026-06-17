import { DEFAULT_OG_IMAGE, SITE_URL } from "@/lib/seo";

export default function SchemaMarkup() {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "AEOCheck",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icons/icon-512.png`,
        width: 512,
        height: 512,
      },
      email: "hello@aeocheck.co",
      description:
        "AEOCheck is an AI search readiness scanner and AEO scanner that checks website visibility for ChatGPT, Perplexity, and Google AI results.",
      foundingDate: "2026",
      sameAs: [
        "https://twitter.com/aeocheck",
        "https://www.linkedin.com/company/aeocheck",
      ],
      founder: {
        "@type": "Person",
        name: "Ummar Ahmed",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "AEOCheck",
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/?url={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Does it work without signup?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Paste any public URL and run a free scan instantly. No account required.",
          },
        },
        {
          "@type": "Question",
          name: "What does the scanner check?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "It checks over 25 AEO and AI search readiness signals, including schema, metadata, headings, content clarity, and answer extraction structure.",
          },
        },
        {
          "@type": "Question",
          name: "Is this the same as a traditional SEO audit?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Traditional SEO audits focus on crawlability, keywords, and backlinks. AEOCheck focuses on whether answer engines like ChatGPT and Perplexity can accurately understand and cite your page.",
          },
        },
        {
          "@type": "Question",
          name: "How do paid plans work right now?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Paid access is currently handled through our contact flow. Send us the plan you want and we will help activate access manually.",
          },
        },
        {
          "@type": "Question",
          name: "Do you store my scan data?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Scans are saved to your account when you are logged in. Free accounts see recent scans. Pro accounts keep full report history.",
          },
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "AEOCheck",
      applicationCategory: "SEOApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description:
        "AI search readiness and AEO scanner for website visibility in ChatGPT, Perplexity, and Google AI results.",
      offers: [
        {
          "@type": "Offer",
          name: "Free",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: "Starter",
          price: "9",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          description: "One-time purchase - unlimited scans, PDF export, multi-page audit.",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "19",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "19",
            priceCurrency: "USD",
            unitCode: "MON",
          },
          description: "Monthly subscription - unlimited scans, monitoring, Compare, Audit.",
        },
        {
          "@type": "Offer",
          name: "Agency",
          price: "49",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "49",
            priceCurrency: "USD",
            unitCode: "MON",
          },
          description: "Monthly subscription - highest limits for agencies managing multiple clients.",
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: SITE_URL,
      name: "AEOCheck - Free AEO Scanner & AI Search Readiness Audit",
      description:
        "Scan any URL for AI search readiness. AEOCheck checks metadata, schema, headings, content clarity, and answer readiness for ChatGPT, Perplexity, and Google AI results.",
      isPartOf: {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
      },
      about: {
        "@type": "Thing",
        name: "Answer Engine Optimization",
      },
      primaryImageOfPage: {
        "@type": "ImageObject",
        url: DEFAULT_OG_IMAGE,
      },
      datePublished: "2026-05-01",
      dateModified: "2026-05-12",
      inLanguage: "en-US",
      potentialAction: {
        "@type": "ReadAction",
        target: SITE_URL,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Site Navigation",
      itemListElement: [
        { "@type": "SiteNavigationElement", position: 1, name: "Home", url: `${SITE_URL}/` },
        { "@type": "SiteNavigationElement", position: 2, name: "Blog", url: `${SITE_URL}/blog` },
        { "@type": "SiteNavigationElement", position: 3, name: "Sample Report", url: `${SITE_URL}/sample-report` },
        { "@type": "SiteNavigationElement", position: 4, name: "About", url: `${SITE_URL}/about` },
        { "@type": "SiteNavigationElement", position: 5, name: "Contact", url: `${SITE_URL}/contact` },
        { "@type": "SiteNavigationElement", position: 6, name: "Login", url: `${SITE_URL}/login` },
        { "@type": "SiteNavigationElement", position: 7, name: "Sign Up", url: `${SITE_URL}/signup` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Person",
      name: "AEOCheck Team",
      url: `${SITE_URL}/about`,
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "AEO Scanner",
      description:
        "AI visibility scanner that checks websites for answer engine optimization readiness across ChatGPT, Perplexity, and other AI search engines.",
      provider: {
        "@type": "Organization",
        name: "AEOCheck",
        url: SITE_URL,
      },
      serviceType: "SEO and AEO Analysis",
      url: `${SITE_URL}/scan`,
      offers: [
        {
          "@type": "Offer",
          name: "Free Plan",
          price: "0",
          priceCurrency: "USD",
        },
        {
          "@type": "Offer",
          name: "Pro Plan",
          price: "19",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "19",
            priceCurrency: "USD",
            unitCode: "MON",
          },
        },
        {
          "@type": "Offer",
          name: "Agency Plan",
          price: "49",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "49",
            priceCurrency: "USD",
            unitCode: "MON",
          },
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Pricing",
          item: `${SITE_URL}/pricing`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Blog",
          item: `${SITE_URL}/blog`,
        },
      ],
    },
  ];

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={`schema-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
