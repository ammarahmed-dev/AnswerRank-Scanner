import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Monitor - AEOCheck",
  description: "Track your website's AEO score over time with weekly or monthly rescans and score trend charts.",
  path: "/monitor",
  noindex: true,
});

const MonitorClient = dynamic(
  () => import("./MonitorClient"),
  {
    ssr: false,
    loading: () => (
      <div className="page-loading">
        <div className="page-loading-spinner" />
        <span>Loading...</span>
      </div>
    ),
  }
);

export default function MonitorPage() {
  return <MonitorClient />;
}
