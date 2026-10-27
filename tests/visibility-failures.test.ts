import { afterEach, describe, expect, it, vi } from "vitest";
const { runVisibilityCheck, saveVisibilityRun } = vi.hoisted(() => ({ runVisibilityCheck: vi.fn(), saveVisibilityRun: vi.fn() }));
vi.mock("@/lib/auth-server", () => ({ getAuthContext: async () => ({ user: { id: "admin", email: "admin@example.test" }, plan: "agency" }) }));
vi.mock("@/lib/admin", () => ({ isMasterAdmin: () => true }));
vi.mock("@/lib/ai-visibility", () => ({ availableEngines: () => [{ name: "gemini" }], normalizeDomain: (s: string) => s, suggestPrompts: () => ["question"], runVisibilityCheck }));
vi.mock("@/lib/ai-visibility-store", () => ({ listVisibilityRuns: vi.fn(), saveVisibilityRun }));
import { POST } from "@/app/api/ai-visibility/route";
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("visibility failure responses", () => {
  it("returns unavailable and does not persist a zero score when every engine fails", async () => {
    vi.stubEnv("AI_VISIBILITY_ENABLED", "true");
    runVisibilityCheck.mockResolvedValue({ checked: 0, mentionRate: 0, citationRate: 0, results: [{ error: "HTTP 429" }] });
    const response = await POST(new Request("https://aeocheck.co/api/ai-visibility", { method: "POST", body: JSON.stringify({ brandName: "Example", domain: "example.test", prompts: ["question"] }) }));
    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data.error).toContain("unavailable");
    expect(data).not.toHaveProperty("mentionRate");
    expect(saveVisibilityRun).not.toHaveBeenCalled();
    expect(runVisibilityCheck.mock.calls[0][3]).toBeTypeOf("function");
  });
  it("rejects null body before starting paid provider calls", async () => {
    vi.stubEnv("AI_VISIBILITY_ENABLED", "true");
    expect((await POST(new Request("https://aeocheck.co/api/ai-visibility", { method: "POST", body: "null" }))).status).toBe(400);
    expect(runVisibilityCheck).not.toHaveBeenCalled();
  });
});
