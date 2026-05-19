import type { Metadata } from "next";
import SampleReportClient from "./SampleReportClient";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Sample AEO Report | AEOCheck",
  description:
    "Preview a client-ready AEOCheck report with AI visibility scoring, schema findings, answer readiness analysis, and prioritized fixes.",
  path: "/sample-report",
});

export default function SampleReportPage() {
  return <SampleReportClient />;
}
