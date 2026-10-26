import { afterEach, describe, expect, it, vi } from "vitest";
import { emitFunnelEvent, FUNNEL_EVENTS } from "@/lib/funnel-events";

afterEach(() => vi.unstubAllGlobals());
describe("Privacy-safe application funnel events", () => {
  it("does nothing during server rendering or without the existing data layer", () => {
    vi.stubGlobal("window", undefined);
    expect(emitFunnelEvent("scan_start")).toBe(false);
    vi.stubGlobal("window", {});
    expect(emitFunnelEvent("scan_start")).toBe(false);
  });
  it.each(FUNNEL_EVENTS)("emits %s with only fixed allowed dimensions", event => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal("window", { dataLayer });
    emitFunnelEvent(event, { source: "report", engagement: "key-pages", url: "https://private.invalid/?token=secret", email: "private@example.invalid", message: "private" } as never);
    expect(dataLayer).toEqual([{ event, aeocheck_event_version: 1, aeocheck_source: event.startsWith("service_") ? "report" : null, aeocheck_engagement: event.startsWith("service_") ? "key-pages" : null }]);
    expect(JSON.stringify(dataLayer)).not.toMatch(/private|secret|email|message|token/);
  });
  it("rejects unknown names and removes untrusted dimension values", () => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal("window", { dataLayer });
    expect(emitFunnelEvent("purchase" as never)).toBe(false);
    emitFunnelEvent("service_lead_saved", { source: "https://private.invalid", engagement: { email: "private" } });
    expect(dataLayer).toEqual([{ event: "service_lead_saved", aeocheck_event_version: 1, aeocheck_source: null, aeocheck_engagement: null }]);
  });
  it("preserves the installed data layer and clears service dimensions on scanner signals", () => {
    const dataLayer: unknown[] = [{ event: "gtm.js" }];
    vi.stubGlobal("window", { dataLayer });
    emitFunnelEvent("service_form_start", { source: "pricing", engagement: "ongoing" });
    emitFunnelEvent("scan_complete");
    expect(window).toHaveProperty("dataLayer", dataLayer);
    expect(dataLayer[0]).toEqual({ event: "gtm.js" });
    expect(dataLayer[2]).toMatchObject({ aeocheck_source: null, aeocheck_engagement: null });
  });
  it("swallows a broken or blocked data-layer hook without breaking the task", () => {
    vi.stubGlobal("window", { dataLayer: { push: () => { throw new Error("blocked"); } } });
    expect(emitFunnelEvent("service_lead_saved")).toBe(false);
  });
});
