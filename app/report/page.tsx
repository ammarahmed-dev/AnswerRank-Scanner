import { Suspense } from "react";
import type { Metadata } from "next";
import ReportClient from "./ReportClient";

type ReportPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getDomainFromParam(value?: string) {
  if (!value) return "Scanned Domain";
  try {
    const parsed = value.startsWith("http://") || value.startsWith("https://")
      ? new URL(value)
      : new URL(`https://${value}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

export async function generateMetadata({ searchParams }: ReportPageProps): Promise<Metadata> {
  const params = searchParams ? await searchParams : {};
  const idParam = params.id;
  const urlParam = params.url;
  const reportId = Array.isArray(idParam) ? idParam[0] : idParam;
  const scannedUrl = Array.isArray(urlParam) ? urlParam[0] : urlParam;
  const domain = getDomainFromParam(scannedUrl);
  const canonical = reportId
    ? `https://aeocheck.co/report?id=${encodeURIComponent(reportId)}`
    : "https://aeocheck.co/report";

  return {
    title: `${domain} — AEO Readiness Report | AEOCheck`,
    description: `AEO readiness report for ${domain}. AI visibility score, priority fixes, schema recommendations, and more.`,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
    alternates: {
      canonical,
    },
  };
}

export default function ReportPage() {
  return (
    <Suspense fallback={null}>
      <ReportClient />
    </Suspense>
  );
}

