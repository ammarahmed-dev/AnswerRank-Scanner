import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";
import MonitorWrapper from "./MonitorWrapper";

export const metadata: Metadata = buildPageMetadata({
  title: "Monitor - AEOCheck",
  description: "Track your website's AEO score over time with weekly or monthly rescans and score trend charts.",
  path: "/monitor",
  noindex: true,
});

export default function MonitorPage() {
  return <MonitorWrapper />;
}
