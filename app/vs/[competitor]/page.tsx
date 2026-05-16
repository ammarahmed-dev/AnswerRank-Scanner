import { notFound } from "next/navigation";
import { Metadata } from "next";
import { COMPETITORS, COMPETITOR_SLUGS } from "../competitors";
import ComparisonPageClient from "./ComparisonPageClient";

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
      canonical: `https://www.aeocheck.co/vs/${slug}`,
    },
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: `https://www.aeocheck.co/vs/${slug}`,
      siteName: "AEOCheck",
      type: "website",
      images: [{ url: "https://www.aeocheck.co/api/og" }],
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
  return <ComparisonPageClient data={data} />;
}
