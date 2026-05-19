import { DEFAULT_OG_IMAGE, SITE_URL } from "@/lib/seo";

export default function SchemaMarkup() {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "AEOCheck",
      url: SITE_URL,
      logo: `${SITE_URL}/icons/icon-512.png`,
      email: "hello@aeocheck.co",
      description:
        "AEOCheck is an AI search readiness scanner and AEO scanner that checks website visibility for ChatGPT, Perplexity, and Google AI results.",
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
      "@type": "HowTo",
      name: "How to check your AEO readiness with AEOCheck",
      description: "Get a scored AEO readiness report for any public website in 60 seconds.",
      step: [
        {
          "@type": "HowToStep",
          position: 1,
          name: "Paste a public website URL",
          text: "Paste any public URL and the scanner fetches the page content, metadata, and structure signals instantly.",
        },
        {
          "@type": "HowToStep",
          position: 2,
          name: "Read every page signal",
          text: "It reads metadata, headings, schema, internal links, and content depth across the full page.",
        },
        {
          "@type": "HowToStep",
          position: 3,
          name: "Score your AI visibility",
          text: "Every signal converts into a weighted 0-100 score with a plain-English verdict for each category.",
        },
        {
          "@type": "HowToStep",
          position: 4,
          name: "Act on the highest-impact fixes",
          text: "Copy the recommendations, implement schema fixes, or unlock the full Pro report for detailed guidance.",
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
          name: "Free Preview",
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: "Full Report",
          price: "14",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          description: "Manual activation through the AEOCheck contact flow.",
        },
        {
          "@type": "Offer",
          name: "Pro Monthly",
          price: "39",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
          description: "Manual activation through the AEOCheck contact flow.",
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
          name: "Scanner",
          item: `${SITE_URL}/#scanner`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Pricing",
          item: `${SITE_URL}/#pricing`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: "FAQ",
          item: `${SITE_URL}/#faq`,
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
