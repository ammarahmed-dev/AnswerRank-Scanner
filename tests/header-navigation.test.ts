import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const state = vi.hoisted(() => ({ configured: false, user: null as null | { email: string }, isAdmin: false, plan: "free" }));
vi.mock("@/lib/supabase-browser-lazy", () => ({ get supabaseConfigured() { return state.configured; }, loadSupabaseBrowserClient: vi.fn() }));
vi.mock("@/app/context/AuthContext", () => ({ useAuth: () => state }));
import AuthButton from "@/app/components/AuthButton";

describe("public navigation is independent of auth configuration", () => {
  beforeEach(() => { state.configured = false; state.user = null; state.isAdmin = false; state.plan = "free"; });
  it("keeps an accessible closed menu and scanner available without Supabase", () => {
    const html = renderToStaticMarkup(createElement(AuthButton));
    expect(html).toContain('aria-label="Open menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toMatch(/<nav[^>]*hidden=""/);
    expect(html).toContain("Implementation services");
    expect(html).toContain("Scan My Website");
    expect(html).not.toContain('href="/login"');
  });
  it("keeps guest auth entry points when configured", () => {
    state.configured = true;
    const html = renderToStaticMarkup(createElement(AuthButton));
    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/signup"');
    expect(html).not.toContain('href="/admin"');
  });
  it("preserves account and logout controls for signed-in users", () => {
    state.configured = true; state.user = { email: "fixture@example.invalid" };
    const html = renderToStaticMarkup(createElement(AuthButton));
    expect(html).toContain('href="/dashboard"');
    expect(html).toContain('aria-label="Log out"');
    expect(html).not.toContain('href="/login"');
    expect(html).not.toContain('href="/admin"');
  });
});
