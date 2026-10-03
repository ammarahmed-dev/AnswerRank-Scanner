"use client";

import Link from "next/link";
import ReportSectionNew from "@/app/components/ReportSectionNew";
import SiteFooter from "@/app/components/SiteFooter";
import SiteHeader from "@/app/components/SiteHeader";
import { SAMPLE_REPORT } from "@/lib/sample-report";
import { useRouter } from "next/navigation";

export default function SampleReportClient() {
  const router = useRouter();
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="sample-report-banner">
        <span>
          This is a sample report.{" "}
          <Link href="/">Scan your own website free at AEOCheck.</Link>
        </span>
      </div>
      <ReportSectionNew report={SAMPLE_REPORT} onReset={() => router.push("/")} />
      <SiteFooter />
    </main>
  );
}
