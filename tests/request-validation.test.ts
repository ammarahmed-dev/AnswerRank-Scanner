import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-server", () => ({ getAuthContext: async () => ({ user: null, plan: "guest" }) }));
const { reserveUsage } = vi.hoisted(() => ({ reserveUsage: vi.fn() }));
vi.mock("@/lib/usage-limits", () => ({ reserveUsage, getClientKey: () => "guest", getPlanLimit: () => 1 }));

describe("scan request validation", () => {
  it("rejects oversized chunked payloads before reserving quota", async () => {
    const { POST } = await import("@/app/api/scan/route");
    const req = new Request("https://aeocheck.co/api/scan", { method: "POST", body: JSON.stringify({ url: "https://example.com", padding: "x".repeat(40_000) }) });
    expect((await POST(req as never)).status).toBe(413);
    expect(reserveUsage).not.toHaveBeenCalled();
  });
  it("rejects malformed options before reserving quota or starting work", async () => {
    const { POST } = await import("@/app/api/scan/route");
    for (const body of [null, [], { url: "https://example.com", competitorUrls: [123] }, { url: "https://example.com", includeAI: "false" }]) {
      const req = new Request("https://aeocheck.co/api/scan", { method: "POST", body: JSON.stringify(body) });
      expect((await POST(req as never)).status).toBe(400);
    }
    expect(reserveUsage).not.toHaveBeenCalled();
  });
  it("rejects invalid comparison arrays without quota effects", async () => {
    const { POST } = await import("@/app/api/compare/route");
    for (const body of [null, { urls: "https://example.com" }, { urls: [null] }]) {
      const req = new Request("https://aeocheck.co/api/compare", { method: "POST", body: JSON.stringify(body) });
      expect((await POST(req)).status).toBe(400);
    }
    expect(reserveUsage).not.toHaveBeenCalled();
  });
});
