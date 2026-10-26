"use client";

import Link from "next/link";
import { SERVICES_PATH } from "@/lib/service-enquiry";
import { emitFunnelEvent } from "@/lib/funnel-events";

export default function ServiceCtaLink({ placement }: { placement: "content" | "report" | "home" | "pricing" }) {
  return <Link href={`${SERVICES_PATH}?source=${placement}`} className="btn btn-primary service-cta-btn"
    onClick={() => emitFunnelEvent("service_cta_click", { source: placement })}>Explore implementation</Link>;
}
