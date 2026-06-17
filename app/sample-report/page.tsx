import type { Metadata } from "next";
import SampleReportClient from "./SampleReportClient";
import { buildPageMetadata, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Sample AEO Report | AEOCheck",
  description:
    "Preview a client-ready AEOCheck report with AI visibility scoring, schema findings, answer readiness analysis, and prioritized fixes.",
  path: "/sample-report",
});

const webPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${SITE_URL}/sample-report#webpage`,
  url: `${SITE_URL}/sample-report`,
  name: "Sample AEO Report | AEOCheck",
  description:
    "Preview a client-ready AEOCheck report with AI visibility scoring, schema findings, answer readiness analysis, and prioritized fixes.",
  isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website` },
  inLanguage: "en-US",
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Sample Report", item: `${SITE_URL}/sample-report` },
  ],
};

export default function SampleReportPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <SampleReportClient />
    </>
  );
}
