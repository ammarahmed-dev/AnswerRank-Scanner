export default function SchemaMarkup() {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "AEOCheck",
      url: "https://aeocheck.co",
      logo: "https://aeocheck.co/logo.png",
      description:
        "AEOCheck is a free AEO and AI search readiness scanner that checks if your website can be found and cited by AI engines like ChatGPT and Perplexity.",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "AEOCheck",
      url: "https://aeocheck.co",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://aeocheck.co/?url={search_term_string}",
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
            text: "It checks schema markup, metadata quality, heading structure, content depth, internal links, and how well the page is structured for AI answer extraction.",
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
          name: "What payment methods do you accept?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "All major credit and debit cards via Stripe. Full Report is one-time, and Pro Monthly is a subscription.",
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
      applicationCategory: "WebApplication",
      operatingSystem: "Web",
      url: "https://aeocheck.co",
      description: "Free AEO readiness scanner that audits your website for AI search visibility.",
      offers: [
        {
          "@type": "Offer",
          name: "Free Preview",
          price: "0",
          priceCurrency: "USD",
        },
        {
          "@type": "Offer",
          name: "Full Report",
          price: "14",
          priceCurrency: "USD",
        },
        {
          "@type": "Offer",
          name: "Pro Monthly",
          price: "39",
          priceCurrency: "USD",
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
