import { describe, expect, it } from "vitest";
import { getServiceCapabilities } from "@/lib/service-capabilities";
const core = { NEXT_PUBLIC_SUPABASE_URL: "https://db.test", NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "service" };

describe("capability readiness", () => {
  it("allows core readiness with one AI provider and no unused OpenAI key", () => {
    const result = getServiceCapabilities({ ...core, DEEPSEEK_API_KEY: "configured" });
    expect(result.ok).toBe(true);
    expect(result.capabilities.aiRecommendations).toBe(true);
    expect(result.capabilities.email).toBe(false);
  });
  it("does not require optional providers to report core configuration ready", () => {
    const result = getServiceCapabilities(core);
    expect(result.ok).toBe(true);
    expect(result.capabilities.aiRecommendations).toBe(false);
    expect(result.capabilities.pageSpeed).toBe(false);
  });
  it("requires database credentials and browser auth configuration", () => {
    expect(getServiceCapabilities({ ...core, SUPABASE_SERVICE_ROLE_KEY: "" }).ok).toBe(false);
    expect(getServiceCapabilities({ ...core, NEXT_PUBLIC_SUPABASE_ANON_KEY: "" }).ok).toBe(false);
  });
});
