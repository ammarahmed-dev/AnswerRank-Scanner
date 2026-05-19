import { notFound } from "next/navigation";
import { Metadata } from "next";
import { COMPETITORS, COMPETITOR_SLUGS } from "../competitors";
import ComparisonPageClient from "./ComparisonPageClient";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/seo";

export function generateStaticParams() {
  return COMPETITOR_SLUGS.map((slug) => ({ competitor: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitor: string }>;
}): Promise<Metadata> {
  const { competitor: slug } = await params;
  const data = COMPETITORS[slug];
  if (!data) return {};
  return {
    title: data.metaTitle,
    description: data.metaDescription,
    alternates: {
      canonical: `${SITE_URL}/vs/${slug}`,
    },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: `${SITE_URL}/vs/${slug}`,
      siteName: SITE_NAME,
      type: "website",
      images: [{ url: DEFAULT_OG_IMAGE }],
    },
    twitter: {
      card: "summary_large_image",
      title: data.metaTitle,
      description: data.metaDescription,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ competitor: string }>;
}) {
  const { competitor: slug } = await params;
  const data = COMPETITORS[slug];
  if (!data) notFound();
  const pageUrl = `${SITE_URL}/vs/${slug}`;
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: data.metaTitle,
        description: data.metaDescription,
        url: pageUrl,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Compare", item: `${SITE_URL}/sitemap` },
          { "@type": "ListItem", position: 3, name: `AEOCheck vs ${data.name}`, item: pageUrl },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `Who should use AEOCheck instead of ${data.name}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: data.verdict,
            },
          },
          {
            "@type": "Question",
            name: `Does AEOCheck include a free scan when compared to ${data.name}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. AEOCheck includes a free scan with no signup required, and paid access is available through the contact flow.",
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <ComparisonPageClient data={data} />
    </>
  );
}
