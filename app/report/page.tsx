import { Suspense } from "react";
import type { Metadata } from "next";
import ReportClient from "./ReportClient";
import { getReportRecord } from "@/lib/report-db";

type ReportPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: ReportPageProps): Promise<Metadata> {
  const params = searchParams ? await searchParams : {};
  const idParam = params.id;
  const reportId = Array.isArray(idParam) ? idParam[0] : idParam;

  if (!reportId) {
    return {
      title: "AEO Report | AEOCheck",
      robots: { index: false, follow: false },
    };
  }

  let report: Awaited<ReturnType<typeof getReportRecord>> | null = null;
  try {
    report = await getReportRecord(reportId);
  } catch {
    report = null;
  }

  if (!report) {
    return {
      title: "AEO Report | AEOCheck",
      robots: { index: false, follow: false },
    };
  }

  const domain = (() => {
    try {
      return new URL(report.url).hostname.replace(/^www\./, "");
    } catch {
      return report.url ?? "unknown";
    }
  })();

  const score = report.score ?? 0;
  const grade = score >= 80 ? "Excellent" : score >= 60 ? "Needs Work" : "Poor";

  const ogImageUrl =
    `https://aeocheck.co/api/og/report` +
    `?score=${score}` +
    `&domain=${encodeURIComponent(domain)}` +
    `&grade=${encodeURIComponent(grade)}`;

  return {
    title: `${domain} - AEO Score ${score}/100 | AEOCheck`,
    description:
      `AEO readiness report for ${domain}. ` +
      `AI visibility score: ${score}/100 (${grade}). ` +
      `See full breakdown and priority fixes.`,
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: `https://aeocheck.co/report?id=${reportId}`,
    },
    openGraph: {
      title: `${domain} scores ${score}/100 on AEOCheck`,
      description:
        `AI search readiness: ${grade}. ` +
        `See what needs fixing at aeocheck.co`,
      url: `https://aeocheck.co/report?id=${reportId}`,
      siteName: "AEOCheck",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `AEOCheck AEO report for ${domain}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${domain} AEO Score: ${score}/100`,
      description:
        `Grade: ${grade}. ` +
        `Check your own site free at aeocheck.co`,
      images: [ogImageUrl],
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
