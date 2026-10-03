import { describe, expect, it } from "vitest";
import { getClientKey, getPlanLimit, FREE_MONTHLY_SCAN_LIMIT, GUEST_MONTHLY_SCAN_LIMIT } from "@/lib/usage-limits";

function req(headers: Record<string, string>) {
  return new Request("https://www.aeocheck.co/api/scan", { headers });
}

describe("getClientKey", () => {
  it("is a stable sha256 hex digest", () => {
    const a = getClientKey(undefined, req({ "x-forwarded-for": "1.2.3.4", "user-agent": "UA" }));
    const b = getClientKey(undefined, req({ "x-forwarded-for": "1.2.3.4", "user-agent": "UA" }));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b);
  });

  it("ignores the client-supplied id when the IP is known", () => {
    const a = getClientKey("id-1", req({ "x-forwarded-for": "1.2.3.4", "user-agent": "UA" }));
    const b = getClientKey("id-2", req({ "x-forwarded-for": "1.2.3.4", "user-agent": "UA" }));
    expect(a).toBe(b);
  });

  it("uses only the first forwarded IP", () => {
    const a = getClientKey(undefined, req({ "x-forwarded-for": "1.2.3.4, 10.0.0.1", "user-agent": "UA" }));
    const b = getClientKey(undefined, req({ "x-forwarded-for": "1.2.3.4", "user-agent": "UA" }));
    expect(a).toBe(b);
  });

  it("falls back to the client id without an IP", () => {
    const a = getClientKey("id-1", req({ "user-agent": "UA" }));
    const b = getClientKey("id-2", req({ "user-agent": "UA" }));
    expect(a).not.toBe(b);
  });
});

describe("getPlanLimit", () => {
  it("maps plans to monthly limits", () => {
    expect(getPlanLimit("guest")).toBe(GUEST_MONTHLY_SCAN_LIMIT);
    expect(getPlanLimit("free")).toBe(FREE_MONTHLY_SCAN_LIMIT);
    expect(getPlanLimit("pro")).toBeGreaterThan(FREE_MONTHLY_SCAN_LIMIT);
    expect(getPlanLimit("agency")).toBe(getPlanLimit("pro"));
  });
});
