import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, writeFileSync } from "node:fs";
const hooks = vi.hoisted(() => ({ values: [] as unknown[] }));
vi.mock("react", async importOriginal => ({ ...await importOriginal<typeof import("react")>(), useState: () => [hooks.values.shift(), () => undefined] }));
vi.mock("@/app/context/AuthContext", () => ({ useAuth: () => ({ loading: false, isAdmin: true }) }));
vi.mock("@/lib/supabase-browser-lazy", () => ({ getBrowserAccessToken: async () => null }));
import AiVisibilityClient from "@/app/ai-visibility/AiVisibilityClient";
import { VISIBILITY_METHOD } from "@/lib/ai-visibility";

const resolved = { prompt: "Best tools?", engine: "gemini", mentioned: true, cited: true, position: 2, citations: ["https://wrapper.example/?private=secret"], citationVerified: true, methodologyVersion: VISIBILITY_METHOD,
  citationEvidence: [{ sourceIndex: 0, state: "resolved", finalUrl: "https://aeocheck.co/guide?private=secret", httpStatus: 200 }] };
const unknown = { ...resolved, citations: ["https://unknown.example/"], prompt: "What should I use?", mentioned: false, cited: false, citationVerified: false,
  citationEvidence: [{ sourceIndex: 0, state: "unverified", reason: "http_error", httpStatus: 403 }] };
const response = { brand: { name: "AEOCheck", domain: "aeocheck.co" }, engines: ["gemini"], saved: true, results: [resolved, unknown], mentionRate: 50, citationRate: 100, citationChecked: 1, checked: 2, brandedChecked: 0, unbrandedChecked: 2 };
function render(citationChecked = 1) {
  hooks.values = ["AEOCheck", "aeocheck.co", "Tools", "Best tools?", "done", "", { ...response, citationChecked }, [
    { id: "old", domain: "aeocheck.co", createdAt: "2026-10-25T00:00:00Z", mentionRate: 100, citationRate: 100, results: [{ ...resolved, methodologyVersion: "visibility-2026-10-v2" }] },
    { id: "new", domain: "aeocheck.co", createdAt: "2026-10-27T00:00:00Z", mentionRate: 50, citationRate: 100, results: [resolved, unknown] },
  ], false];
  return renderToStaticMarkup(createElement(AiVisibilityClient));
}
afterEach(() => { hooks.values = []; });
describe("destination-checked visibility presentation", () => {
  it("shows verified destinations and unknown evidence without exposing URL queries", () => {
    const html = render();
    expect(html).toContain("domain cited as a source");
    expect(html).toContain("source destination not verified");
    expect(html).toContain("wrapper.example: reached aeocheck.co (HTTP 200)");
    expect(html).toContain("unknown.example: not verified (http_error, HTTP 403)");
    expect(html).toContain("not answer-to-source entailment or citation quality");
    expect(html).not.toContain("private=secret");
    expect(html).toContain("older or unverified citation method");
    expect(html).toContain("Up to 20 unique sources are checked per run.");
    expect(html).toContain("destination-checked method");
    mkdirSync("test-results/services", { recursive: true });
    writeFileSync("test-results/services/visibility-destination-fixture.html", html);
  });
  it("labels an unavailable citation denominator without a numeric zero claim", () => {
    expect(render(0)).toContain("<strong>Unavailable</strong> citation rate");
  });
});
