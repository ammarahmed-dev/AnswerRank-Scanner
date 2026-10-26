import { SERVICE_ENGAGEMENTS, SERVICE_SOURCES } from "@/lib/service-enquiry";

export const FUNNEL_EVENTS = ["scan_start", "scan_complete", "service_cta_click", "service_form_start", "service_lead_saved"] as const;
type FunnelEvent = typeof FUNNEL_EVENTS[number];

/** Data-layer signals only. Container routing/consent and GA receipt require separate verification. */
export function emitFunnelEvent(event: FunnelEvent, values?: { source?: unknown; engagement?: unknown }): boolean {
  try {
    if (typeof window === "undefined" || !FUNNEL_EVENTS.includes(event)) return false;
    const layer = (window as Window & { dataLayer?: { push(value: unknown): unknown } }).dataLayer;
    if (!layer || typeof layer.push !== "function") return false;
    const service = event.startsWith("service_");
    // Explicit nulls clear our own service dimensions before a later scanner event.
    layer.push({
      event,
      aeocheck_event_version: 1,
      aeocheck_source: service ? SERVICE_SOURCES.find(value => value === values?.source) ?? null : null,
      aeocheck_engagement: service ? SERVICE_ENGAGEMENTS.find(value => value.value === values?.engagement)?.value ?? null : null,
    });
    return true;
  } catch {
    // Analytics must never block navigation, scanning or a saved confirmation.
    return false;
  }
}
