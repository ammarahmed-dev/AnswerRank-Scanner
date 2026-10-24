import { describe, expect, it, vi } from "vitest";
const { runScanCore, releaseUsage } = vi.hoisted(() => ({ runScanCore: vi.fn(), releaseUsage: vi.fn() }));
vi.mock("@/lib/scan-core", () => ({ runScanCore }));
vi.mock("@/lib/auth-server", () => ({ getAuthContext: async () => ({ user: null, plan: "guest" }) }));
vi.mock("@/lib/usage-limits", () => ({
  reserveUsage: async () => ({ allowed: true, reserved: true, limit: 3, count: 1 }),
  getClientKey: () => "test", getPlanLimit: () => 3, releaseUsage, commitUsage: vi.fn(),
}));
import { POST } from "@/app/api/compare/route";

describe("comparison cancellation", () => {
  it("aborts the remaining scan before returning usage when one scan fails", async () => {
    let siblingSignal: AbortSignal | undefined;
    runScanCore.mockImplementation((url: string, options: { signal: AbortSignal }) => {
      if (url.includes("first.test")) return Promise.reject(new Error("Page failed"));
      siblingSignal = options.signal;
      return new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error("Cancelled")), { once: true }));
    });
    releaseUsage.mockImplementation(async () => { expect(siblingSignal?.aborted).toBe(true); });
    const response = await POST(new Request("https://aeocheck.co/api/compare", { method: "POST", body: JSON.stringify({ urls: ["https://first.test", "https://second.test"] }) }));
    expect(response.status).toBe(500);
    expect(runScanCore).toHaveBeenCalledTimes(2);
    expect(siblingSignal?.aborted).toBe(true);
    expect(releaseUsage).toHaveBeenCalledOnce();
  });
});
