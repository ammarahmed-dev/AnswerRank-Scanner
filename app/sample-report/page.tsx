import type { Metadata } from "next";
import SampleReportClient from "./SampleReportClient";

export const metadata: Metadata = {
  title: "Sample AEO Report | AEOCheck",
  description: "See what a full AEOCheck AI visibility report looks like before you scan your own site.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function SampleReportPage() {
  return <SampleReportClient />;
}
